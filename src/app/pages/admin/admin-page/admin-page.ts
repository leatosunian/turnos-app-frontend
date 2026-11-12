import { DecimalPipe, NgTemplateOutlet, formatNumber } from '@angular/common';
import { Component, DestroyRef, LOCALE_ID, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Subject, catchError, map, of, switchMap, tap } from 'rxjs';
import { ApiError } from '../../../core/models/api-error';
import { AdminStatsResponse, PeriodoEstadisticas } from '../../../core/models/estadisticas';
import { EstadisticasService } from '../../../core/services/estadisticas-service';
import { Boton } from '../../../shared/components/boton/boton';
import { Pastilla } from '../../../shared/components/pastilla/pastilla';
import { OpcionSegmentado, Segmentado } from '../../../shared/components/segmentado/segmentado';
import { MontoPipe } from '../../../shared/pipes/monto-pipe';

const OPCIONES: OpcionSegmentado[] = [
  { valor: 'WEEK', texto: 'Semana' },
  { valor: 'MONTH', texto: 'Mes' },
  { valor: 'YEAR', texto: 'Año' },
];

const MESES_CORTOS = [
  'Ene',
  'Feb',
  'Mar',
  'Abr',
  'May',
  'Jun',
  'Jul',
  'Ago',
  'Sep',
  'Oct',
  'Nov',
  'Dic',
];
const MESES = [
  'enero',
  'febrero',
  'marzo',
  'abril',
  'mayo',
  'junio',
  'julio',
  'agosto',
  'septiembre',
  'octubre',
  'noviembre',
  'diciembre',
];

/** Cuántos meses muestra el gráfico de usuarios nuevos, contando el actual. */
const MESES_GRAFICO = 6;

@Component({
  imports: [Boton, DecimalPipe, MontoPipe, NgTemplateOutlet, Pastilla, Segmentado],
  selector: 'app-admin-page',
  styleUrl: './admin-page.css',
  templateUrl: './admin-page.html',
})
export class AdminPage implements OnInit {
  private readonly estadisticas = inject(EstadisticasService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly locale = inject(LOCALE_ID);
  private readonly pedidos = new Subject<PeriodoEstadisticas>();

  protected readonly opciones = OPCIONES;
  protected readonly opcion = signal<PeriodoEstadisticas>('MONTH');

  /** La respuesta junto con el período que se pidió, para armar el título. */
  private readonly respuesta = signal<{
    periodo: PeriodoEstadisticas;
    stats: AdminStatsResponse;
  } | null>(null);
  protected readonly stats = computed(() => this.respuesta()?.stats ?? null);
  protected readonly cargando = signal(false);
  protected readonly error = signal('');

  /** "noviembre", "semana del 09/11" o "2026". */
  protected readonly textoPeriodo = computed(() => {
    const respuesta = this.respuesta();
    if (!respuesta) return '';
    const [anio, mes, dia] = respuesta.stats.period.from.slice(0, 10).split('-');
    switch (respuesta.periodo) {
      case 'WEEK':
        return `semana del ${dia}/${mes}`;
      case 'YEAR':
        return anio;
      default:
        return MESES[Number(mes) - 1];
    }
  });

  protected readonly porcentajeCancelados = computed(() => {
    const turnos = this.stats()?.appointments;
    return turnos && turnos.total > 0 ? (turnos.cancelled / turnos.total) * 100 : null;
  });

  /** Los últimos 6 meses: el back sólo manda los meses con altas, el resto va en 0. */
  protected readonly meses = computed(() => {
    const altas = new Map(
      (this.stats()?.userGrowth ?? []).map((p) => [`${p.year}-${p.month}`, p.newUsers]),
    );
    const hoy = new Date();
    const lista = Array.from({ length: MESES_GRAFICO }, (_, i) => {
      const fecha = new Date(hoy.getFullYear(), hoy.getMonth() - (MESES_GRAFICO - 1 - i), 1);
      const mes = fecha.getMonth();
      return {
        clave: `${fecha.getFullYear()}-${mes + 1}`,
        corto: MESES_CORTOS[mes],
        largo: `${MESES[mes]} ${fecha.getFullYear()}`,
        cantidad: altas.get(`${fecha.getFullYear()}-${mes + 1}`) ?? 0,
        actual: i === MESES_GRAFICO - 1,
      };
    });
    const maximo = Math.max(0, ...lista.map((m) => m.cantidad));
    return lista.map((m) => ({ ...m, alto: maximo > 0 ? (m.cantidad / maximo) * 100 : 0 }));
  });

  ngOnInit(): void {
    this.pedidos
      .pipe(
        tap(() => {
          this.cargando.set(true);
          this.error.set('');
        }),
        // switchMap: si se cambia de período antes de que llegue la respuesta, se descarta la vieja.
        switchMap((periodo) =>
          this.estadisticas.deAdmin(periodo).pipe(
            map((stats) => ({ periodo, stats })),
            catchError((error: ApiError) => {
              this.error.set(error.message);
              return of(null);
            }),
          ),
        ),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((respuesta) => {
        if (respuesta) this.respuesta.set(respuesta);
        this.cargando.set(false);
      });

    this.pedir();
  }

  protected elegirOpcion(opcion: string): void {
    this.opcion.set(opcion as PeriodoEstadisticas);
    this.pedir();
  }

  protected pedir(): void {
    this.pedidos.next(this.opcion());
  }

  /** $41,8 M, $800k: los montos completos no entran en las tarjetas. */
  protected montoCorto(valor: number): string {
    if (valor >= 1_000_000) return `$${formatNumber(valor / 1_000_000, this.locale, '1.0-1')} M`;
    if (valor >= 1_000) return `$${formatNumber(valor / 1_000, this.locale, '1.0-0')}k`;
    return `$${formatNumber(valor, this.locale, '1.0-0')}`;
  }
}
