import { NgTemplateOutlet } from '@angular/common';
import {
  Component,
  DestroyRef,
  ElementRef,
  OnInit,
  computed,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { Observable, Subscription, catchError, forkJoin, map, of } from 'rxjs';
import { ApiError } from '../../../core/models/api-error';
import {
  AppointmentResponse,
  AppointmentStatus,
  sePuedeSuspender,
} from '../../../core/models/turno';
import { AppointmentService } from '../../../core/services/appointment-service';
import { NegocioService } from '../../../core/services/negocio-service';
import { MenuMasEstado } from '../../../layouts/private-layout/menu-mas/menu-mas-estado';
import { AvisoVacio } from '../../../shared/components/aviso-vacio/aviso-vacio';
import { Boton } from '../../../shared/components/boton/boton';
import { Confirmacion } from '../../../shared/components/confirmacion/confirmacion';
import { EstadoTurno } from '../../../shared/components/estado-turno/estado-turno';
import { Pastilla } from '../../../shared/components/pastilla/pastilla';
import { FechaPipe } from '../../../shared/pipes/fecha-pipe';
import { HoraPipe } from '../../../shared/pipes/hora-pipe';
import { MontoPipe } from '../../../shared/pipes/monto-pipe';

const TAMANIO_PAGINA = 20;

interface Filtro {
  status: AppointmentStatus | null;
  texto: string;
}

// Uno por estado del back: Confirmado y Terminado son los dos BOOKED y el endpoint no los separa.
const FILTROS: Filtro[] = [
  { status: null, texto: 'Todos' },
  { status: 'UNBOOKED', texto: 'Libres' },
  { status: 'AWAITING_PAYMENT', texto: 'Esperando seña' },
  { status: 'BOOKED', texto: 'Reservados' },
  { status: 'CANCELLED', texto: 'Cancelados' },
  { status: 'SUSPENDED', texto: 'Suspendidos' },
];

type EstadoNegocio = 'cargando' | 'listo' | 'sin-negocio' | 'error';
type TipoAccion = 'suspender' | 'eliminar';

interface Accion {
  tipo: TipoAccion;
  turno: AppointmentResponse;
}

interface GrupoDia {
  clave: string;
  fecha: string;
  /** "Hoy", "Mañana" o "Ayer"; null para los demás días. */
  relativo: string | null;
  turnos: AppointmentResponse[];
}

/** Clave por filtro para los contadores: el estado o "todos". */
type ClaveFiltro = AppointmentStatus | 'todos';

@Component({
  imports: [
    NgTemplateOutlet,
    RouterLink,
    AvisoVacio,
    Boton,
    Confirmacion,
    EstadoTurno,
    Pastilla,
    FechaPipe,
    HoraPipe,
    MontoPipe,
  ],
  selector: 'app-turnos-page',
  styleUrl: './turnos-page.css',
  templateUrl: './turnos-page.html',
  host: {
    '(document:click)': 'cerrarMenu()',
    '(document:keydown.escape)': 'alEscape()',
  },
})
export class TurnosPage implements OnInit {
  private readonly turnosApi = inject(AppointmentService);
  private readonly negocios = inject(NegocioService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly menuMas = inject(MenuMasEstado);
  private readonly tabla = viewChild<ElementRef<HTMLElement>>('tabla');
  private pedido?: Subscription;
  private businessId = '';

  protected readonly filtros = FILTROS;

  protected readonly estadoNegocio = signal<EstadoNegocio>('cargando');
  protected readonly errorNegocio = signal('');

  protected readonly filtro = signal<AppointmentStatus | null>(null);
  protected readonly turnos = signal<AppointmentResponse[]>([]);
  /** Primera y última página que hay en `turnos`. En el celular "Cargar más" suma páginas. */
  protected readonly primeraPagina = signal(0);
  protected readonly ultimaPagina = signal(0);
  protected readonly total = signal(0);
  protected readonly totalPaginas = signal(0);
  protected readonly cargando = signal<'pagina' | 'mas' | null>(null);
  protected readonly error = signal('');

  protected readonly contadores = signal<Partial<Record<ClaveFiltro, number>>>({});

  /** Id del turno con el menú "⋯" abierto. */
  protected readonly menuAbierto = signal<string | null>(null);
  protected readonly accion = signal<Accion | null>(null);
  protected readonly procesando = signal(false);
  protected readonly errorAccion = signal('');

  protected readonly desde = computed(() =>
    this.turnos().length ? this.primeraPagina() * TAMANIO_PAGINA + 1 : 0,
  );
  protected readonly hasta = computed(() => this.desde() + this.turnos().length - 1);
  protected readonly hayMas = computed(() => this.ultimaPagina() + 1 < this.totalPaginas());
  protected readonly paginas = computed(() =>
    numerosDePagina(this.primeraPagina(), this.totalPaginas()),
  );
  protected readonly grupos = computed(() => agruparPorDia(this.turnos()));

  ngOnInit(): void {
    this.negocios
      .miNegocio()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (negocio) => {
          this.businessId = negocio.id;
          this.estadoNegocio.set('listo');
          this.irAPagina(0);
          this.cargarContadores();
        },
        error: (error: ApiError) => {
          this.errorNegocio.set(error.message);
          this.estadoNegocio.set(error.status === 404 ? 'sin-negocio' : 'error');
        },
      });
  }

  protected contador(status: AppointmentStatus | null): number | undefined {
    return this.contadores()[status ?? 'todos'];
  }

  protected elegirFiltro(status: AppointmentStatus | null): void {
    if (this.filtro() === status) return;
    this.filtro.set(status);
    this.irAPagina(0);
  }

  /** Reemplaza la lista por esa página (paginación de escritorio). */
  protected irAPagina(numero: number): void {
    this.cargar(numero, false);
  }

  /** Paginación de la tabla: cambia de página y vuelve al principio de la tabla. */
  protected cambiarPagina(numero: number): void {
    this.irAPagina(numero);
    this.tabla()?.nativeElement.scrollIntoView?.({ block: 'start' });
  }

  /** Link "‹ Más" del celular: vuelve al menú de donde se entró. */
  protected volverAMas(): void {
    this.menuMas.abrir();
  }

  /** Suma la página siguiente a la lista (celular). */
  protected cargarMas(): void {
    this.cargar(this.ultimaPagina() + 1, true);
  }

  protected reintentar(): void {
    this.irAPagina(this.primeraPagina());
  }

  protected puedeSuspender(turno: AppointmentResponse): boolean {
    return sePuedeSuspender(turno);
  }

  protected puedeEliminar(turno: AppointmentResponse): boolean {
    return turno.status === 'UNBOOKED';
  }

  protected tieneAcciones(turno: AppointmentResponse): boolean {
    return this.puedeSuspender(turno) || this.puedeEliminar(turno);
  }

  protected alternarMenu(turno: AppointmentResponse, evento: Event): void {
    // Si no, el click llega al document y lo cierra en el acto.
    evento.stopPropagation();
    this.menuAbierto.update((id) => (id === turno.id ? null : turno.id));
  }

  protected cerrarMenu(): void {
    this.menuAbierto.set(null);
  }

  protected pedirConfirmacion(tipo: TipoAccion, turno: AppointmentResponse): void {
    this.cerrarMenu();
    this.errorAccion.set('');
    this.accion.set({ tipo, turno });
  }

  protected cancelarAccion(): void {
    if (this.procesando()) return;
    this.accion.set(null);
  }

  // El diálogo de confirmación maneja su propio Escape.
  protected alEscape(): void {
    this.cerrarMenu();
  }

  protected confirmarAccion(): void {
    const accion = this.accion();
    if (!accion || this.procesando()) return;

    const pedido: Observable<unknown> =
      accion.tipo === 'suspender'
        ? this.turnosApi.suspender(accion.turno.id)
        : this.turnosApi.eliminar(accion.turno.id);

    this.procesando.set(true);
    this.errorAccion.set('');
    pedido.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        this.procesando.set(false);
        this.accion.set(null);
        // Si se borró el último de la página, vuelve a la anterior.
        const pagina =
          this.turnos().length === 1 && this.primeraPagina() > 0
            ? this.primeraPagina() - 1
            : this.primeraPagina();
        this.irAPagina(pagina);
        this.cargarContadores();
      },
      error: (error: ApiError) => {
        this.procesando.set(false);
        this.errorAccion.set(error.message);
      },
    });
  }

  private cargar(numero: number, sumar: boolean): void {
    this.pedido?.unsubscribe();
    this.cargando.set(sumar ? 'mas' : 'pagina');
    this.error.set('');
    this.cerrarMenu();

    this.pedido = this.turnosApi
      .listar(this.businessId, { status: this.filtro(), page: numero, size: TAMANIO_PAGINA })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (pagina) => {
          this.turnos.update((actuales) => (sumar ? [...actuales, ...pagina.items] : pagina.items));
          if (!sumar) this.primeraPagina.set(numero);
          this.ultimaPagina.set(numero);
          this.total.set(pagina.total);
          this.totalPaginas.set(pagina.totalPaginas);
          this.cargando.set(null);
        },
        error: (error: ApiError) => {
          this.error.set(error.message);
          this.cargando.set(null);
        },
      });
  }

  /** Un pedido de 1 turno por filtro. Si alguno falla, ese chip queda sin número. */
  private cargarContadores(): void {
    const pedidos = Object.fromEntries(
      FILTROS.map((f) => [
        f.status ?? 'todos',
        this.turnosApi.contar(this.businessId, f.status).pipe(catchError(() => of(undefined))),
      ]),
    ) as Record<ClaveFiltro, Observable<number | undefined>>;

    forkJoin(pedidos)
      .pipe(
        map((totales) =>
          Object.fromEntries(Object.entries(totales).filter(([, total]) => total !== undefined)),
        ),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((totales) => this.contadores.set(totales));
  }
}

/** Páginas a mostrar (base 0), con null donde van los "…". */
export function numerosDePagina(actual: number, total: number): (number | null)[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i);

  const cerca = [0, actual - 1, actual, actual + 1, total - 1].filter((n) => n >= 0 && n < total);
  const unicas = [...new Set(cerca)].sort((a, b) => a - b);
  const resultado: (number | null)[] = [];
  unicas.forEach((n, i) => {
    if (i > 0 && n - unicas[i - 1] > 1) resultado.push(null);
    resultado.push(n);
  });
  return resultado;
}

/** Agrupa turnos consecutivos del mismo día. La lista ya viene ordenada. */
export function agruparPorDia(turnos: AppointmentResponse[], hoy = new Date()): GrupoDia[] {
  const relativos: Record<string, string> = {
    [claveDia(hoy, -1)]: 'Ayer',
    [claveDia(hoy, 0)]: 'Hoy',
    [claveDia(hoy, 1)]: 'Mañana',
  };
  const grupos: GrupoDia[] = [];
  for (const turno of turnos) {
    const clave = turno.startDatetime.slice(0, 10);
    const ultimo = grupos.at(-1);
    if (ultimo?.clave === clave) {
      ultimo.turnos.push(turno);
    } else {
      grupos.push({
        clave,
        fecha: turno.startDatetime,
        relativo: relativos[clave] ?? null,
        turnos: [turno],
      });
    }
  }
  return grupos;
}

/** `aaaa-mm-dd` en hora local, igual que las fechas del back (LocalDateTime sin zona). */
function claveDia(base: Date, dias: number): string {
  const fecha = new Date(base.getFullYear(), base.getMonth(), base.getDate() + dias);
  const mes = String(fecha.getMonth() + 1).padStart(2, '0');
  const dia = String(fecha.getDate()).padStart(2, '0');
  return `${fecha.getFullYear()}-${mes}-${dia}`;
}
