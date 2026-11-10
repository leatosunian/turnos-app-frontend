import { formatDate, formatNumber } from '@angular/common';
import { Component, DestroyRef, LOCALE_ID, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Subject, catchError, forkJoin, of, switchMap } from 'rxjs';
import {
  EmployeeStatsResponse,
  PeriodoActividad,
  periodoAnterior,
} from '../../../core/models/actividad';
import { ActividadService } from '../../../core/services/actividad-service';
import { AuthService } from '../../../core/services/auth-service';
import { AvisoVacio } from '../../../shared/components/aviso-vacio/aviso-vacio';
import { Boton } from '../../../shared/components/boton/boton';
import { OpcionSegmentado, Segmentado } from '../../../shared/components/segmentado/segmentado';
import { MontoPipe } from '../../../shared/pipes/monto-pipe';

type Estado = 'cargando' | 'listo' | 'error' | 'sin-negocio';

const PERIODOS: OpcionSegmentado[] = [
  { valor: 'WEEK', texto: 'Semana' },
  { valor: 'MONTH', texto: 'Mes' },
  { valor: 'YEAR', texto: 'Año' },
];

const DIA = 24 * 60 * 60 * 1000;

/** yyyy-MM-dd como fecha local (new Date('yyyy-MM-dd') la toma en UTC y puede correr el día). */
function fechaLocal(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}

@Component({
  imports: [AvisoVacio, Boton, Segmentado, MontoPipe],
  selector: 'app-actividad-page',
  styleUrl: './actividad-page.css',
  templateUrl: './actividad-page.html',
})
export class ActividadPage implements OnInit {
  private readonly actividad = inject(ActividadService);
  private readonly auth = inject(AuthService);
  private readonly locale = inject(LOCALE_ID);
  private readonly destroyRef = inject(DestroyRef);
  private readonly pedidos = new Subject<PeriodoActividad>();

  protected readonly periodos = PERIODOS;
  protected readonly periodo = signal<string>('MONTH' satisfies PeriodoActividad);
  protected readonly estado = signal<Estado>('cargando');
  protected readonly stats = signal<EmployeeStatsResponse | null>(null);
  /** Ingresos del período anterior, para la comparación. Null si no se pudieron traer. */
  private readonly ingresosAnteriores = signal<number | null>(null);

  private readonly usuario = this.auth.usuario;
  protected readonly negocio = computed(() => this.usuario()?.businessName ?? null);
  protected readonly nombre = computed(() => this.usuario()?.name.trim().split(/\s+/)[0] ?? '');

  /** "01/11 — 30/11/2026". */
  protected readonly rango = computed(() => {
    const periodo = this.stats()?.period;
    if (!periodo) return '';
    const desde = fechaLocal(periodo.from);
    const hasta = fechaLocal(periodo.to);
    const formatoDesde = desde.getFullYear() === hasta.getFullYear() ? 'dd/MM' : 'dd/MM/yyyy';
    return `${formatDate(desde, formatoDesde, this.locale)} — ${formatDate(hasta, 'dd/MM/yyyy', this.locale)}`;
  });

  protected readonly horas = computed(() =>
    formatNumber(this.stats()?.hoursWorked ?? 0, this.locale, '1.1-1'),
  );

  /**
   * "promedio 2,7 h por día" en lo que va del período (o en todo, si ya terminó). En el año va
   * por mes, porque repartido en 300 días queda en 0,0.
   */
  protected readonly promedio = computed(() => {
    const stats = this.stats();
    if (!stats) return '';
    const desde = fechaLocal(stats.period.from);
    const hoy = new Date();
    const hasta = new Date(
      Math.min(
        fechaLocal(stats.period.to).getTime(),
        new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate()).getTime(),
      ),
    );

    if (this.periodo() === 'YEAR') {
      const meses = Math.max(1, hasta.getMonth() - desde.getMonth() + 1);
      return `promedio ${formatNumber(stats.hoursWorked / meses, this.locale, '1.1-1')} h por mes`;
    }
    const dias = Math.max(1, Math.round((hasta.getTime() - desde.getTime()) / DIA) + 1);
    return `promedio ${formatNumber(stats.hoursWorked / dias, this.locale, '1.1-1')} h por día`;
  });

  /** "+8% vs octubre"; null si no hay con qué comparar. */
  protected readonly comparacion = computed(() => {
    const actuales = this.stats()?.revenueGenerated;
    const anteriores = this.ingresosAnteriores();
    if (actuales === undefined || !anteriores) return null;

    const variacion = Math.round(((actuales - anteriores) / anteriores) * 100);
    return {
      texto: `${variacion >= 0 ? '+' : ''}${variacion}% vs ${this.contraQue()}`,
      sube: variacion >= 0,
    };
  });

  /** Para las barras: el servicio con más turnos ocupa el ancho entero. */
  protected readonly servicios = computed(() => {
    const servicios = [...(this.stats()?.byService ?? [])].sort(
      (a, b) => b.appointmentCount - a.appointmentCount,
    );
    const maximo = Math.max(1, ...servicios.map((s) => s.appointmentCount));
    return servicios.map((s) => ({ ...s, ancho: (s.appointmentCount / maximo) * 100 }));
  });

  ngOnInit(): void {
    this.pedidos
      .pipe(
        switchMap((periodo) => {
          const businessId = this.usuario()?.businessId;
          const employeeId = this.usuario()?.id;
          if (!businessId || !employeeId) return of('sin-negocio' as const);

          return forkJoin({
            actual: this.actividad.delEmpleado(businessId, employeeId, periodo),
            // si falla la comparación, se muestra igual el período actual
            anterior: this.actividad
              .delEmpleado(businessId, employeeId, periodoAnterior(periodo))
              .pipe(catchError(() => of(null))),
          }).pipe(catchError(() => of('error' as const)));
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((resultado) => {
        if (typeof resultado === 'string') {
          this.estado.set(resultado);
          return;
        }
        this.stats.set(resultado.actual);
        this.ingresosAnteriores.set(resultado.anterior?.revenueGenerated ?? null);
        this.estado.set('listo');
      });

    this.cargar();
  }

  protected elegirPeriodo(periodo: string): void {
    this.periodo.set(periodo);
    this.cargar();
  }

  protected cargar(): void {
    this.estado.set('cargando');
    this.pedidos.next(this.periodo() as PeriodoActividad);
  }

  protected cerrarSesion(): void {
    this.auth.cerrarSesion();
  }

  private contraQue(): string {
    switch (this.periodo() as PeriodoActividad) {
      case 'WEEK':
        return 'la semana pasada';
      case 'MONTH': {
        const desde = fechaLocal(periodoAnterior('MONTH').from);
        return formatDate(desde, 'MMMM', this.locale);
      }
      case 'YEAR':
        return String(new Date().getFullYear() - 1);
    }
  }
}
