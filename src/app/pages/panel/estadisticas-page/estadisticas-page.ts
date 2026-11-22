import { DecimalPipe, NgTemplateOutlet, formatNumber } from '@angular/common';
import { Component, DestroyRef, LOCALE_ID, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { Subject, catchError, forkJoin, map, of, switchMap, tap } from 'rxjs';
import { ApiError } from '../../../core/models/api-error';
import { BusinessStatsResponse, PeriodoEstadisticas } from '../../../core/models/estadisticas';
import {
  EstadisticasService,
  FiltroEstadisticas,
} from '../../../core/services/estadisticas-service';
import { NegocioService } from '../../../core/services/negocio-service';
import { AvisoVacio } from '../../../shared/components/aviso-vacio/aviso-vacio';
import { Boton } from '../../../shared/components/boton/boton';
import { OpcionSegmentado, Segmentado } from '../../../shared/components/segmentado/segmentado';
import { MontoPipe } from '../../../shared/pipes/monto-pipe';

type EstadoNegocio = 'cargando' | 'listo' | 'sin-negocio' | 'error';

const OPCIONES: OpcionSegmentado[] = [
  { valor: 'TODAY', texto: 'Hoy' },
  { valor: 'WEEK', texto: 'Semana' },
  { valor: 'MONTH', texto: 'Mes' },
  { valor: 'YEAR', texto: 'Año' },
  { valor: 'RANGO', texto: 'Rango…' },
];

// El back manda sólo los días con turnos, en inglés. Se muestran los 7, de lunes a domingo.
const DIAS: { clave: string; corto: string; largo: string }[] = [
  { clave: 'MONDAY', corto: 'Lun', largo: 'Lunes' },
  { clave: 'TUESDAY', corto: 'Mar', largo: 'Martes' },
  { clave: 'WEDNESDAY', corto: 'Mié', largo: 'Miércoles' },
  { clave: 'THURSDAY', corto: 'Jue', largo: 'Jueves' },
  { clave: 'FRIDAY', corto: 'Vie', largo: 'Viernes' },
  { clave: 'SATURDAY', corto: 'Sáb', largo: 'Sábado' },
  { clave: 'SUNDAY', corto: 'Dom', largo: 'Domingo' },
];

/** "2026-10-01" o "2026-10-01T00:00:00" → "2026-10-01". */
function soloFecha(valor: string): string {
  return valor.slice(0, 10);
}

function hoy(): string {
  const fecha = new Date();
  const dosDigitos = (n: number) => String(n).padStart(2, '0');
  return `${fecha.getFullYear()}-${dosDigitos(fecha.getMonth() + 1)}-${dosDigitos(fecha.getDate())}`;
}

@Component({
  imports: [AvisoVacio, Boton, DecimalPipe, MontoPipe, NgTemplateOutlet, RouterLink, Segmentado],
  selector: 'app-estadisticas-page',
  styleUrl: './estadisticas-page.css',
  templateUrl: './estadisticas-page.html',
})
export class EstadisticasPage implements OnInit {
  private readonly negocios = inject(NegocioService);
  private readonly estadisticas = inject(EstadisticasService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly locale = inject(LOCALE_ID);
  private readonly pedidos = new Subject<FiltroEstadisticas>();
  private businessId = '';

  protected readonly opciones = OPCIONES;

  protected readonly estadoNegocio = signal<EstadoNegocio>('cargando');
  protected readonly errorNegocio = signal('');
  protected readonly iniciales = signal('');

  protected readonly opcion = signal<string>('MONTH');
  protected readonly desde = signal('');
  protected readonly hasta = signal('');

  protected readonly stats = signal<BusinessStatsResponse | null>(null);
  protected readonly cargando = signal(false);
  protected readonly error = signal('');
  /** Horas por profesional. Vienen de un pedido por cada uno: null mientras llegan. */
  protected readonly horas = signal<Record<string, number | null> | null>(null);

  protected readonly esRango = computed(() => this.opcion() === 'RANGO');
  protected readonly errorRango = computed(() =>
    this.desde() && this.hasta() && this.desde() > this.hasta()
      ? 'La fecha "desde" tiene que ser anterior a "hasta".'
      : '',
  );

  /** "01/10 — 28/10/2026". */
  protected readonly textoPeriodo = computed(() => {
    const periodo = this.stats()?.period;
    if (!periodo) return '';
    const [anioDesde, mesDesde, diaDesde] = soloFecha(periodo.from).split('-');
    const [anioHasta, mesHasta, diaHasta] = soloFecha(periodo.to).split('-');
    const fin = `${diaHasta}/${mesHasta}/${anioHasta}`;
    if (soloFecha(periodo.from) === soloFecha(periodo.to)) return fin;
    // El año del inicio sólo se repite si es distinto al del final.
    const inicio = `${diaDesde}/${mesDesde}${anioDesde !== anioHasta ? '/' + anioDesde : ''}`;
    return `${inicio} — ${fin}`;
  });

  protected readonly sinTurnos = computed(() => this.stats()?.appointments.total === 0);

  /** Ordenados por ingresos. La barra es proporcional al que más generó. */
  protected readonly servicios = computed(() => {
    const lista = [...(this.stats()?.byService ?? [])].sort(
      (a, b) => b.revenue - a.revenue || b.appointmentCount - a.appointmentCount,
    );
    const maximo = Math.max(0, ...lista.map((s) => s.revenue));
    return lista.map((servicio) => ({
      ...servicio,
      ancho: maximo > 0 ? Math.max(2, (servicio.revenue / maximo) * 100) : 0,
    }));
  });

  protected readonly dias = computed(() => {
    const cantidades = new Map(
      (this.stats()?.peakDays ?? []).map((d) => [d.dayOfWeek, d.appointmentCount]),
    );
    const maximo = Math.max(0, ...cantidades.values());
    return DIAS.map((dia) => {
      const cantidad = cantidades.get(dia.clave) ?? 0;
      return {
        ...dia,
        cantidad,
        alto: maximo > 0 ? (cantidad / maximo) * 100 : 0,
        pico: maximo > 0 && cantidad === maximo,
      };
    });
  });

  ngOnInit(): void {
    this.pedidos
      .pipe(
        tap(() => {
          this.cargando.set(true);
          this.error.set('');
        }),
        // switchMap: si se cambia de período antes de que llegue la respuesta, se descarta la vieja.
        switchMap((filtro) =>
          this.estadisticas.delNegocio(this.businessId, filtro).pipe(
            tap((stats) => {
              this.stats.set(stats);
              this.horas.set(null);
              this.cargando.set(false);
            }),
            switchMap((stats) => this.cargarHoras(stats, filtro)),
            catchError((error: ApiError) => {
              this.error.set(error.message);
              this.cargando.set(false);
              return of(null);
            }),
          ),
        ),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((horas) => {
        if (horas) this.horas.set(horas);
      });

    this.cargarNegocio();
  }

  protected cargarNegocio(): void {
    this.estadoNegocio.set('cargando');
    this.negocios
      .miNegocio()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (negocio) => {
          // Siempre el id de /businesses/mine: el back no controla que el negocio sea del usuario.
          this.businessId = negocio.id;
          this.iniciales.set(
            negocio.name
              .trim()
              .split(/\s+/)
              .slice(0, 2)
              .map((p) => p[0] ?? '')
              .join('')
              .toUpperCase(),
          );
          this.estadoNegocio.set('listo');
          this.pedir();
        },
        error: (error: ApiError) => {
          this.errorNegocio.set(error.message);
          this.estadoNegocio.set(error.status === 404 ? 'sin-negocio' : 'error');
        },
      });
  }

  protected elegirOpcion(opcion: string): void {
    this.opcion.set(opcion);
    if (opcion === 'RANGO') {
      // Arranca con las fechas que se están viendo, así sólo hay que ajustar una.
      const periodo = this.stats()?.period;
      this.desde.set(periodo ? soloFecha(periodo.from) : hoy());
      this.hasta.set(periodo ? soloFecha(periodo.to) : hoy());
    }
    this.pedir();
  }

  protected cambiarDesde(valor: string): void {
    this.desde.set(valor);
    this.pedir();
  }

  protected cambiarHasta(valor: string): void {
    this.hasta.set(valor);
    this.pedir();
  }

  protected pedir(): void {
    if (!this.businessId) return;
    if (this.esRango()) {
      if (!this.desde() || !this.hasta() || this.errorRango()) return;
      this.pedidos.next({ desde: this.desde(), hasta: this.hasta() });
    } else {
      this.pedidos.next(this.opcion() as PeriodoEstadisticas);
    }
  }

  /** $800k, $1,1 M: para las filas, donde el monto completo no entra. */
  protected montoCorto(valor: number): string {
    if (valor >= 1_000_000) return `$${formatNumber(valor / 1_000_000, this.locale, '1.0-1')} M`;
    if (valor >= 1_000) return `$${formatNumber(valor / 1_000, this.locale, '1.0-0')}k`;
    return `$${formatNumber(valor, this.locale, '1.0-0')}`;
  }

  /** Las horas no vienen en las estadísticas del negocio: hay un pedido por profesional. */
  private cargarHoras(stats: BusinessStatsResponse, filtro: FiltroEstadisticas) {
    if (!stats.byEmployee.length) return of({});
    return forkJoin(
      stats.byEmployee.map((empleado) =>
        this.estadisticas.delEmpleado(this.businessId, empleado.employeeId, filtro).pipe(
          map((detalle) => [empleado.employeeId, detalle.hoursWorked] as const),
          // Si falla uno, se muestra "—" en sus horas y el resto sigue.
          catchError(() => of([empleado.employeeId, null] as const)),
        ),
      ),
    ).pipe(map((pares) => Object.fromEntries(pares) as Record<string, number | null>));
  }
}
