import { NgTemplateOutlet } from '@angular/common';
import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { Observable, forkJoin, switchMap } from 'rxjs';
import { ApiError } from '../../../core/models/api-error';
import { ServResponse } from '../../../core/models/servicio';
import { UserResponse } from '../../../core/models/usuario';
import { EmpleadoService } from '../../../core/services/empleado-service';
import { NegocioService } from '../../../core/services/negocio-service';
import { ServicioService } from '../../../core/services/servicio-service';
import { MenuMasEstado } from '../../../layouts/private-layout/menu-mas/menu-mas-estado';
import { AvisoVacio } from '../../../shared/components/aviso-vacio/aviso-vacio';
import { Boton } from '../../../shared/components/boton/boton';
import { Confirmacion } from '../../../shared/components/confirmacion/confirmacion';
import { Pastilla } from '../../../shared/components/pastilla/pastilla';
import { OpcionSegmentado, Segmentado } from '../../../shared/components/segmentado/segmentado';
import { MontoPipe } from '../../../shared/pipes/monto-pipe';
import { EmpleadoDialogo } from './empleado-dialogo/empleado-dialogo';
import { montoSena } from './sena';
import { ServicioDialogo } from './servicio-dialogo/servicio-dialogo';

type EstadoNegocio = 'cargando' | 'listo' | 'sin-negocio' | 'error';
type Pestania = 'servicios' | 'equipo';

/** Qué diálogo de alta/edición está abierto. `item` es null para crear. */
type Edicion =
  { tipo: 'servicio'; item: ServResponse | null } | { tipo: 'empleado'; item: UserResponse | null };

type Baja = { tipo: 'servicio'; item: ServResponse } | { tipo: 'empleado'; item: UserResponse };

function plural(cantidad: number, singular: string, plural: string): string {
  return `${cantidad} ${cantidad === 1 ? singular : plural}`;
}

@Component({
  imports: [
    NgTemplateOutlet,
    RouterLink,
    AvisoVacio,
    Boton,
    Confirmacion,
    EmpleadoDialogo,
    MontoPipe,
    Pastilla,
    Segmentado,
    ServicioDialogo,
  ],
  selector: 'app-servicios-page',
  styleUrl: './servicios-page.css',
  templateUrl: './servicios-page.html',
  host: {
    '(document:click)': 'cerrarMenu()',
    '(document:keydown.escape)': 'cerrarMenu()',
  },
})
export class ServiciosPage implements OnInit {
  private readonly negocios = inject(NegocioService);
  private readonly serviciosApi = inject(ServicioService);
  private readonly empleadosApi = inject(EmpleadoService);
  private readonly menuMas = inject(MenuMasEstado);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly pestanias: OpcionSegmentado[] = [
    { valor: 'servicios', texto: 'Servicios' },
    { valor: 'equipo', texto: 'Equipo' },
  ];

  protected readonly estado = signal<EstadoNegocio>('cargando');
  protected readonly errorCarga = signal('');
  protected readonly businessId = signal('');
  protected readonly servicios = signal<ServResponse[]>([]);
  protected readonly equipo = signal<UserResponse[]>([]);

  /** Sólo en el celular, donde servicios y equipo van en dos pestañas. */
  protected readonly pestania = signal<string>('servicios');
  /** Id del servicio o profesional con el menú "···" abierto. */
  protected readonly menuAbierto = signal<string | null>(null);
  protected readonly edicion = signal<Edicion | null>(null);
  protected readonly baja = signal<Baja | null>(null);
  protected readonly procesandoBaja = signal(false);
  protected readonly errorBaja = signal('');

  protected readonly resumenServicios = computed(() =>
    plural(this.servicios().length, 'servicio', 'servicios'),
  );
  protected readonly resumen = computed(
    () =>
      `${this.resumenServicios()} · ${plural(this.equipo().length, 'profesional', 'profesionales')}`,
  );

  protected readonly montoSena = montoSena;

  ngOnInit(): void {
    this.cargar();
  }

  protected cargar(): void {
    this.estado.set('cargando');
    this.negocios
      .miNegocio()
      .pipe(
        switchMap((negocio) => {
          // Siempre el id de /businesses/mine: el back no controla que el negocio sea del usuario.
          this.businessId.set(negocio.id);
          return forkJoin({
            servicios: this.serviciosApi.listar(negocio.id),
            equipo: this.empleadosApi.listar(negocio.id),
          });
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: ({ servicios, equipo }) => {
          this.servicios.set(servicios);
          this.equipo.set(equipo);
          this.estado.set('listo');
        },
        error: (error: ApiError) => {
          this.errorCarga.set(error.message);
          this.estado.set(error.status === 404 ? 'sin-negocio' : 'error');
        },
      });
  }

  /** Link "‹ Más" del celular: vuelve al menú de donde se entró. */
  protected volverAMas(): void {
    this.menuMas.abrir();
  }

  protected alternarMenu(id: string, evento: Event): void {
    // Si no, el click llega al document y lo cierra en el acto.
    evento.stopPropagation();
    this.menuAbierto.update((abierto) => (abierto === id ? null : id));
  }

  protected cerrarMenu(): void {
    this.menuAbierto.set(null);
  }

  protected nuevoServicio(): void {
    this.edicion.set({ tipo: 'servicio', item: null });
  }

  protected nuevoEmpleado(): void {
    this.edicion.set({ tipo: 'empleado', item: null });
  }

  protected editar(edicion: Edicion): void {
    this.cerrarMenu();
    this.edicion.set(edicion);
  }

  protected cerrarEdicion(): void {
    this.edicion.set(null);
  }

  protected servicioGuardado(servicio: ServResponse): void {
    this.servicios.update((lista) => reemplazarOAgregar(lista, servicio));
    this.cerrarEdicion();
  }

  protected empleadoGuardado(empleado: UserResponse): void {
    this.equipo.update((lista) => reemplazarOAgregar(lista, empleado));
    this.cerrarEdicion();
  }

  protected pedirBaja(baja: Baja): void {
    this.cerrarMenu();
    this.errorBaja.set('');
    this.baja.set(baja);
  }

  protected cancelarBaja(): void {
    if (!this.procesandoBaja()) this.baja.set(null);
  }

  protected confirmarBaja(): void {
    const baja = this.baja();
    if (!baja || this.procesandoBaja()) return;

    const pedido: Observable<void> =
      baja.tipo === 'servicio'
        ? this.serviciosApi.eliminar(this.businessId(), baja.item.id)
        : this.empleadosApi.eliminar(baja.item.id);

    this.procesandoBaja.set(true);
    pedido.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        if (baja.tipo === 'servicio') {
          this.servicios.update((lista) => lista.filter((s) => s.id !== baja.item.id));
        } else {
          this.equipo.update((lista) => lista.filter((e) => e.id !== baja.item.id));
        }
        this.procesandoBaja.set(false);
        this.baja.set(null);
      },
      error: (error: ApiError) => {
        // Por ejemplo, 409 si el profesional tiene turnos pendientes. El diálogo queda abierto.
        this.procesandoBaja.set(false);
        this.errorBaja.set(error.message);
      },
    });
  }

  protected iniciales(nombre: string): string {
    return nombre
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((palabra) => palabra[0] ?? '')
      .join('')
      .toUpperCase();
  }
}

function reemplazarOAgregar<T extends { id: string }>(lista: T[], item: T): T[] {
  return lista.some((x) => x.id === item.id)
    ? lista.map((x) => (x.id === item.id ? item : x))
    : [...lista, item];
}
