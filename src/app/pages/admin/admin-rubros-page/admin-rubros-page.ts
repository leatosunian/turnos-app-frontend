import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { catchError, forkJoin, of } from 'rxjs';
import { ApiError } from '../../../core/models/api-error';
import { BusinessTypeResponse } from '../../../core/models/negocio';
import { RubroService } from '../../../core/services/rubro-service';
import { AvisoVacio } from '../../../shared/components/aviso-vacio/aviso-vacio';
import { Boton } from '../../../shared/components/boton/boton';
import { Campo } from '../../../shared/components/campo/campo';
import { Confirmacion } from '../../../shared/components/confirmacion/confirmacion';

type Estado = 'cargando' | 'listo' | 'error';

/** Para comparar nombres sin que importen mayúsculas, tildes ni espacios de más. */
export function claveRubro(nombre: string): string {
  return nombre
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

@Component({
  imports: [AvisoVacio, Boton, Campo, Confirmacion],
  selector: 'app-admin-rubros-page',
  styleUrl: './admin-rubros-page.css',
  templateUrl: './admin-rubros-page.html',
})
export class AdminRubrosPage implements OnInit {
  private readonly servicio = inject(RubroService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly estado = signal<Estado>('cargando');
  private readonly lista = signal<BusinessTypeResponse[]>([]);
  /** Null si no se pudo contar: la columna queda vacía. */
  private readonly cantidades = signal<Map<string, number> | null>(null);
  protected readonly aviso = signal('');

  protected readonly rubros = computed(() =>
    [...this.lista()].sort((a, b) => a.name.localeCompare(b.name)),
  );

  // alta
  protected readonly nuevo = signal('');
  protected readonly creando = signal(false);
  protected readonly errorNuevo = signal('');
  /** El error se muestra recién después de intentar crear, no mientras se escribe. */
  private readonly intentoCrear = signal(false);

  // edición en la fila
  protected readonly editando = signal<string | null>(null);
  protected readonly nombreEditado = signal('');
  protected readonly guardando = signal(false);
  protected readonly errorEdicion = signal('');

  // baja
  protected readonly aEliminar = signal<BusinessTypeResponse | null>(null);
  protected readonly eliminando = signal(false);
  protected readonly errorBaja = signal('');

  protected readonly errorNuevoVisible = computed(
    () => this.errorNuevo() || (this.intentoCrear() ? this.validar(this.nuevo()) : ''),
  );

  ngOnInit(): void {
    this.cargar();
  }

  protected cargar(): void {
    this.estado.set('cargando');
    forkJoin({
      rubros: this.servicio.listar(),
      cantidades: this.servicio.negociosPorRubro().pipe(catchError(() => of(null))),
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ rubros, cantidades }) => {
          this.lista.set(rubros);
          this.cantidades.set(cantidades);
          this.estado.set('listo');
        },
        error: () => this.estado.set('error'),
      });
  }

  /** Null si no se sabe. */
  protected negocios(rubro: BusinessTypeResponse): number | null {
    const cantidades = this.cantidades();
    return cantidades ? (cantidades.get(rubro.id) ?? 0) : null;
  }

  /** Mensaje de error del nombre, o vacío si está bien. `exceptoId` es el rubro que se edita. */
  private validar(nombre: string, exceptoId?: string): string {
    const clave = claveRubro(nombre);
    if (!clave) return 'Escribí un nombre.';
    if (nombre.trim().length > 50) return 'Usá 50 caracteres o menos.';
    const repetido = this.lista().find((r) => r.id !== exceptoId && claveRubro(r.name) === clave);
    return repetido ? `Ya existe el rubro ${repetido.name}.` : '';
  }

  protected escribirNuevo(valor: string): void {
    this.nuevo.set(valor);
    this.errorNuevo.set('');
  }

  protected crear(): void {
    this.intentoCrear.set(true);
    if (this.validar(this.nuevo()) || this.creando()) return;

    const nombre = this.nuevo().trim().replace(/\s+/g, ' ');
    this.creando.set(true);
    this.servicio
      .crear(nombre)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (rubro) => {
          this.lista.update((lista) => [...lista, rubro]);
          this.aviso.set(`Creaste el rubro ${rubro.name}.`);
          this.nuevo.set('');
          this.intentoCrear.set(false);
          this.creando.set(false);
        },
        error: (error: ApiError) => {
          this.creando.set(false);
          // el back también rechaza nombres de rubros eliminados, que no están en la lista
          this.errorNuevo.set(
            error.message?.trim() || 'No pudimos crear el rubro. Probá de nuevo.',
          );
        },
      });
  }

  protected empezarEdicion(rubro: BusinessTypeResponse): void {
    this.editando.set(rubro.id);
    this.nombreEditado.set(rubro.name);
    this.errorEdicion.set('');
  }

  protected cancelarEdicion(): void {
    this.editando.set(null);
  }

  protected guardarEdicion(rubro: BusinessTypeResponse): void {
    const error = this.validar(this.nombreEditado(), rubro.id);
    if (error) {
      this.errorEdicion.set(error);
      return;
    }
    const nombre = this.nombreEditado().trim().replace(/\s+/g, ' ');
    if (nombre === rubro.name) {
      this.editando.set(null);
      return;
    }

    this.guardando.set(true);
    this.servicio
      .editar(rubro.id, nombre)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (editado) => {
          this.lista.update((lista) => lista.map((r) => (r.id === editado.id ? editado : r)));
          this.aviso.set(`Guardaste el rubro ${editado.name}.`);
          this.guardando.set(false);
          this.editando.set(null);
        },
        error: (error: ApiError) => {
          this.guardando.set(false);
          this.errorEdicion.set(
            error.message?.trim() || 'No pudimos guardar el rubro. Probá de nuevo.',
          );
        },
      });
  }

  protected pedirEliminar(rubro: BusinessTypeResponse): void {
    this.errorBaja.set('');
    this.aEliminar.set(rubro);
  }

  protected cerrarEliminar(): void {
    this.aEliminar.set(null);
  }

  protected confirmarEliminar(): void {
    const rubro = this.aEliminar();
    if (!rubro) return;

    this.eliminando.set(true);
    this.errorBaja.set('');
    this.servicio
      .eliminar(rubro.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.lista.update((lista) => lista.filter((r) => r.id !== rubro.id));
          this.aviso.set(`Eliminaste el rubro ${rubro.name}.`);
          this.eliminando.set(false);
          this.aEliminar.set(null);
        },
        error: (error: ApiError) => {
          this.eliminando.set(false);
          this.errorBaja.set(error.message || 'No pudimos eliminar el rubro. Probá de nuevo.');
        },
      });
  }
}
