import { DOCUMENT, NgTemplateOutlet } from '@angular/common';
import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { Subscription, interval } from 'rxjs';
import { ApiError } from '../../../core/models/api-error';
import { BusinessStatsResponse } from '../../../core/models/estadisticas';
import { AppointmentResponse, DepositStatus, sePuedeSuspender } from '../../../core/models/turno';
import { AppointmentService } from '../../../core/services/appointment-service';
import { EstadisticasService } from '../../../core/services/estadisticas-service';
import { NegocioService } from '../../../core/services/negocio-service';
import { AvisoVacio } from '../../../shared/components/aviso-vacio/aviso-vacio';
import { Boton } from '../../../shared/components/boton/boton';
import { Confirmacion } from '../../../shared/components/confirmacion/confirmacion';
import { EstadoTurno } from '../../../shared/components/estado-turno/estado-turno';
import { Pastilla } from '../../../shared/components/pastilla/pastilla';
import { FechaPipe } from '../../../shared/pipes/fecha-pipe';
import { HoraPipe } from '../../../shared/pipes/hora-pipe';
import { MontoPipe } from '../../../shared/pipes/monto-pipe';
import {
  duracionMinutos,
  minutosRestantes,
  porcentajeSena,
  resumirHoy,
  turnoEnCurso,
  turnoInicial,
} from './resumen-hoy';

type EstadoCarga = 'cargando' | 'listo' | 'error';
type EstadoCopia = 'nada' | 'copiado' | 'fallo';

const TEXTO_SENA: Record<DepositStatus, string> = {
  PENDING: 'pendiente',
  PAID: 'pagada',
  REFUNDED: 'devuelta',
  FORFEITED: 'retenida',
  CANCELED: 'cancelada',
};

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
  selector: 'app-hoy-page',
  styleUrl: './hoy-page.css',
  templateUrl: './hoy-page.html',
  host: { '(document:keydown.escape)': 'alEscape()' },
})
export class HoyPage implements OnInit {
  private readonly turnosApi = inject(AppointmentService);
  private readonly estadisticas = inject(EstadisticasService);
  private readonly negocios = inject(NegocioService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly origen = inject(DOCUMENT).location.origin;
  private readonly ventana = inject(DOCUMENT).defaultView;
  private businessId = '';
  private pedidoTurnos?: Subscription;
  private timerCopia?: ReturnType<typeof setTimeout>;

  protected readonly duracion = duracionMinutos;
  protected readonly porcentajeSena = porcentajeSena;

  /** Se actualiza cada 30 s para que "En curso" y los minutos que faltan no queden viejos. */
  protected readonly ahora = signal(new Date());

  protected readonly estadoNegocio = signal<'cargando' | 'listo' | 'sin-negocio' | 'error'>(
    'cargando',
  );
  protected readonly errorNegocio = signal('');

  protected readonly turnos = signal<AppointmentResponse[]>([]);
  protected readonly estadoTurnos = signal<EstadoCarga>('cargando');
  protected readonly errorTurnos = signal('');

  protected readonly stats = signal<BusinessStatsResponse | null>(null);
  protected readonly estadoStats = signal<EstadoCarga>('cargando');

  private readonly seleccionId = signal<string | null>(null);
  /** En el celular el detalle se abre como hoja desde abajo. */
  protected readonly hojaAbierta = signal(false);

  protected readonly suspendiendo = signal<AppointmentResponse | null>(null);
  protected readonly procesando = signal(false);
  protected readonly errorAccion = signal('');
  protected readonly copia = signal<EstadoCopia>('nada');

  protected readonly resumen = computed(() => resumirHoy(this.turnos()));
  protected readonly enCurso = computed(() => turnoEnCurso(this.turnos(), this.ahora()));
  protected readonly minutosEnCurso = computed(() => {
    const turno = this.enCurso();
    return turno ? minutosRestantes(turno, this.ahora()) : 0;
  });
  protected readonly seleccionado = computed(() => {
    const id = this.seleccionId();
    const turnos = this.turnos();
    return (id && turnos.find((t) => t.id === id)) || turnoInicial(turnos, this.ahora());
  });
  /** Barra de ocupación en 4 tramos, como en la maqueta. */
  protected readonly tramosOcupacion = computed(() => {
    const llenos = Math.round(((this.resumen().ocupacion ?? 0) / 100) * 4);
    return [0, 1, 2, 3].map((i) => i < llenos);
  });

  constructor() {
    interval(30_000)
      .pipe(takeUntilDestroyed())
      .subscribe(() => this.ahora.set(new Date()));
    this.destroyRef.onDestroy(() => clearTimeout(this.timerCopia));
  }

  ngOnInit(): void {
    this.negocios
      .miNegocio()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (negocio) => {
          this.businessId = negocio.id;
          this.estadoNegocio.set('listo');
          this.cargarTurnos();
          this.cargarStats();
        },
        error: (error: ApiError) => {
          this.errorNegocio.set(error.message);
          this.estadoNegocio.set(error.status === 404 ? 'sin-negocio' : 'error');
        },
      });
  }

  /** "pagada", "pendiente", "devuelta"… */
  protected estadoSena(turno: AppointmentResponse): string {
    return turno.deposit ? TEXTO_SENA[turno.deposit.status] : '';
  }

  protected terminado(turno: AppointmentResponse): boolean {
    return turno.status === 'BOOKED' && new Date(turno.endDatetime) <= this.ahora();
  }

  protected esEnCurso(turno: AppointmentResponse): boolean {
    return this.enCurso()?.id === turno.id;
  }

  protected puedeSuspender(turno: AppointmentResponse): boolean {
    return sePuedeSuspender(turno, this.ahora());
  }

  protected elegir(turno: AppointmentResponse): void {
    this.seleccionId.set(turno.id);
    this.copia.set('nada');
    // En escritorio el detalle ya está a la derecha; la hoja es solo para el celular.
    this.hojaAbierta.set(!this.ventana?.matchMedia?.('(min-width: 1024px)').matches);
  }

  protected cerrarHoja(): void {
    this.hojaAbierta.set(false);
  }

  // Si está abierta la confirmación, Escape la cierra a ella (lo maneja el diálogo), no a la hoja.
  protected alEscape(): void {
    if (!this.suspendiendo()) this.cerrarHoja();
  }

  protected reintentarTurnos(): void {
    this.cargarTurnos();
  }

  /** Por ahora el back no manda mails: se copia el link de /reserva/:id para mandarlo a mano. */
  protected async copiarLinkPago(turno: AppointmentResponse): Promise<void> {
    try {
      await navigator.clipboard.writeText(`${this.origen}/reserva/${turno.id}`);
      this.copia.set('copiado');
    } catch {
      this.copia.set('fallo');
    }
    clearTimeout(this.timerCopia);
    this.timerCopia = setTimeout(() => this.copia.set('nada'), 2500);
  }

  protected pedirSuspender(turno: AppointmentResponse): void {
    this.errorAccion.set('');
    this.suspendiendo.set(turno);
  }

  protected cancelarSuspender(): void {
    this.suspendiendo.set(null);
  }

  protected confirmarSuspender(): void {
    const turno = this.suspendiendo();
    if (!turno || this.procesando()) return;

    this.procesando.set(true);
    this.errorAccion.set('');
    this.turnosApi
      .suspender(turno.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.procesando.set(false);
          this.suspendiendo.set(null);
          this.cargarTurnos();
          this.cargarStats();
        },
        error: (error: ApiError) => {
          this.procesando.set(false);
          this.errorAccion.set(error.message);
        },
      });
  }

  private cargarTurnos(): void {
    this.pedidoTurnos?.unsubscribe();
    // Al recargar después de una acción, la lista queda visible mientras llega la nueva.
    if (!this.turnos().length) this.estadoTurnos.set('cargando');
    this.pedidoTurnos = this.turnosApi
      .deHoy(this.businessId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (turnos) => {
          this.turnos.set(turnos);
          this.ahora.set(new Date());
          this.estadoTurnos.set('listo');
        },
        error: (error: ApiError) => {
          this.errorTurnos.set(error.message);
          this.estadoTurnos.set('error');
        },
      });
  }

  /** Si fallan, las tarjetas que dependen de las estadísticas muestran "—" y el resto sigue. */
  private cargarStats(): void {
    this.estadisticas
      .delNegocio(this.businessId, 'TODAY')
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (stats) => {
          this.stats.set(stats);
          this.estadoStats.set('listo');
        },
        error: () => this.estadoStats.set('error'),
      });
  }
}
