import { NgTemplateOutlet } from '@angular/common';
import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { catchError, forkJoin, of } from 'rxjs';
import { ApiError } from '../../../core/models/api-error';
import { BusinessResponse } from '../../../core/models/negocio';
import { AdminNegocioService } from '../../../core/services/admin-negocio-service';
import { AdminUsuarioService } from '../../../core/services/admin-usuario-service';
import { AvisoVacio } from '../../../shared/components/aviso-vacio/aviso-vacio';
import { Boton } from '../../../shared/components/boton/boton';
import { Confirmacion } from '../../../shared/components/confirmacion/confirmacion';
import { numerosDePagina } from '../../panel/turnos-page/turnos-page';

type Estado = 'cargando' | 'listo' | 'error';

const TAMANIO_PAGINA = 10;

/** Para buscar sin que importen mayúsculas ni tildes. */
function normalizar(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

@Component({
  imports: [NgTemplateOutlet, AvisoVacio, Boton, Confirmacion],
  selector: 'app-admin-negocios-page',
  styleUrl: './admin-negocios-page.css',
  templateUrl: './admin-negocios-page.html',
})
export class AdminNegociosPage implements OnInit {
  private readonly adminNegocios = inject(AdminNegocioService);
  private readonly adminUsuarios = inject(AdminUsuarioService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly estado = signal<Estado>('cargando');
  private readonly negocios = signal<BusinessResponse[]>([]);
  /** Nombre de cada dueño por id. Si no se pudo traer, la columna queda vacía. */
  private readonly duenios = signal<Map<string, string>>(new Map());

  protected readonly busqueda = signal('');
  /** Id del rubro elegido; vacío es "Todos los rubros". */
  protected readonly rubro = signal('');
  protected readonly pagina = signal(0);

  protected readonly aDarDeBaja = signal<BusinessResponse | null>(null);
  protected readonly procesando = signal(false);
  protected readonly errorBaja = signal('');
  protected readonly aviso = signal('');

  protected readonly total = computed(() => this.negocios().length);
  protected readonly deBaja = computed(() => this.negocios().filter((n) => n.deleted).length);

  /** Los rubros que usa algún negocio, sin repetir y en orden alfabético. */
  protected readonly rubros = computed(() => {
    const porId = new Map<string, string>();
    for (const negocio of this.negocios()) {
      for (const tipo of negocio.businessTypes) porId.set(tipo.id, tipo.name);
    }
    return [...porId]
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  });

  /** Activos primero y después por nombre. Filtra por nombre, slug o dueño, y por rubro. */
  protected readonly filtrados = computed(() => {
    const texto = normalizar(this.busqueda());
    const rubro = this.rubro();
    return this.negocios()
      .filter((n) => !rubro || n.businessTypes.some((t) => t.id === rubro))
      .filter(
        (n) =>
          !texto ||
          [n.name, n.slug, this.duenio(n)].some((campo) => normalizar(campo).includes(texto)),
      )
      .sort((a, b) => Number(a.deleted) - Number(b.deleted) || a.name.localeCompare(b.name));
  });

  protected readonly totalPaginas = computed(() =>
    Math.max(1, Math.ceil(this.filtrados().length / TAMANIO_PAGINA)),
  );
  /** Si la búsqueda achica la lista, la página no puede quedar fuera de rango. */
  protected readonly paginaActual = computed(() =>
    Math.min(this.pagina(), this.totalPaginas() - 1),
  );
  protected readonly visibles = computed(() =>
    this.filtrados().slice(
      this.paginaActual() * TAMANIO_PAGINA,
      (this.paginaActual() + 1) * TAMANIO_PAGINA,
    ),
  );
  protected readonly desde = computed(() =>
    this.filtrados().length ? this.paginaActual() * TAMANIO_PAGINA + 1 : 0,
  );
  protected readonly hasta = computed(() =>
    Math.min((this.paginaActual() + 1) * TAMANIO_PAGINA, this.filtrados().length),
  );
  protected readonly paginas = computed(() =>
    numerosDePagina(this.paginaActual(), this.totalPaginas()),
  );

  ngOnInit(): void {
    this.cargar();
  }

  protected cargar(): void {
    this.estado.set('cargando');
    forkJoin({
      negocios: this.adminNegocios.listar(),
      // sin usuarios la lista se muestra igual, solo sin el nombre del dueño
      usuarios: this.adminUsuarios.listar().pipe(catchError(() => of([]))),
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ negocios, usuarios }) => {
          this.negocios.set(negocios);
          this.duenios.set(new Map(usuarios.map((u) => [u.id, u.name])));
          this.estado.set('listo');
        },
        error: () => this.estado.set('error'),
      });
  }

  protected duenio(negocio: BusinessResponse): string {
    return this.duenios().get(negocio.ownerId) ?? '';
  }

  protected rubrosDe(negocio: BusinessResponse): string {
    return negocio.businessTypes.map((t) => t.name).join(' · ');
  }

  protected buscar(texto: string): void {
    this.busqueda.set(texto);
    this.pagina.set(0);
  }

  protected filtrarRubro(id: string): void {
    this.rubro.set(id);
    this.pagina.set(0);
  }

  protected cambiarPagina(numero: number): void {
    this.pagina.set(Math.max(0, Math.min(numero, this.totalPaginas() - 1)));
  }

  protected pedirBaja(negocio: BusinessResponse): void {
    this.errorBaja.set('');
    this.aDarDeBaja.set(negocio);
  }

  protected cerrarBaja(): void {
    this.aDarDeBaja.set(null);
  }

  protected confirmarBaja(): void {
    const negocio = this.aDarDeBaja();
    // el botón se deshabilita mientras procesa, pero se cuida igual de un segundo envío
    if (!negocio || this.procesando()) return;

    this.procesando.set(true);
    this.errorBaja.set('');
    this.adminNegocios
      .darDeBaja(negocio.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.negocios.update((negocios) =>
            negocios.map((n) => (n.id === negocio.id ? { ...n, deleted: true } : n)),
          );
          this.aviso.set(`${negocio.name} quedó dado de baja.`);
          this.procesando.set(false);
          this.aDarDeBaja.set(null);
        },
        error: (error: ApiError) => {
          this.procesando.set(false);
          this.errorBaja.set(error.message || 'No pudimos dar de baja el negocio. Probá de nuevo.');
        },
      });
  }
}
