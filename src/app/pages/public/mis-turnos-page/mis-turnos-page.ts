import { DatePipe } from '@angular/common';
import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { ApiError } from '../../../core/models/api-error';
import { AppointmentResponse } from '../../../core/models/turno';
import {
  esProximo,
  limiteDevolucion,
  sePuedeCancelar,
  seDevuelveLaSena,
} from '../../../core/models/turno-cliente';
import { AppointmentService } from '../../../core/services/appointment-service';
import { AvisoVacio } from '../../../shared/components/aviso-vacio/aviso-vacio';
import { Boton } from '../../../shared/components/boton/boton';
import { Confirmacion } from '../../../shared/components/confirmacion/confirmacion';
import { EstadoTurno } from '../../../shared/components/estado-turno/estado-turno';
import { Pastilla } from '../../../shared/components/pastilla/pastilla';
import { OpcionSegmentado, Segmentado } from '../../../shared/components/segmentado/segmentado';
import { DuracionPipe } from '../../../shared/pipes/duracion-pipe';
import { FechaPipe } from '../../../shared/pipes/fecha-pipe';
import { HoraPipe } from '../../../shared/pipes/hora-pipe';
import { MontoPipe } from '../../../shared/pipes/monto-pipe';

type Pestania = 'proximos' | 'historial';
type Estado = 'cargando' | 'listo' | 'error';

/** Cuántos turnos pasados se muestran al costado (o abajo, en el celular) de los próximos. */
const HISTORIAL_RECIENTE = 4;

const MINUTO = 60 * 1000;
const DIA = 24 * 60 * MINUTO;

function inicioDelDia(fecha: Date): number {
  return new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate()).getTime();
}

@Component({
  imports: [
    DatePipe,
    RouterLink,
    AvisoVacio,
    Boton,
    Confirmacion,
    EstadoTurno,
    Pastilla,
    Segmentado,
    DuracionPipe,
    FechaPipe,
    HoraPipe,
    MontoPipe,
  ],
  selector: 'app-mis-turnos-page',
  styleUrl: './mis-turnos-page.css',
  templateUrl: './mis-turnos-page.html',
})
export class MisTurnosPage implements OnInit {
  private readonly appointments = inject(AppointmentService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly estado = signal<Estado>('cargando');
  protected readonly turnos = signal<AppointmentResponse[]>([]);
  protected readonly pestania = signal<string>('proximos' satisfies Pestania);

  /** Se toma al cargar: alcanza para separar próximos de historial y para la regla de 24 h. */
  protected readonly ahora = signal(new Date());

  /** El más cercano primero. */
  protected readonly proximos = computed(() =>
    this.turnos()
      .filter((t) => esProximo(t, this.ahora()))
      .sort((a, b) => a.startDatetime.localeCompare(b.startDatetime)),
  );

  /** El más reciente primero. */
  protected readonly historial = computed(() =>
    this.turnos()
      .filter((t) => !esProximo(t, this.ahora()))
      .sort((a, b) => b.startDatetime.localeCompare(a.startDatetime)),
  );

  protected readonly historialReciente = computed(() =>
    this.historial().slice(0, HISTORIAL_RECIENTE),
  );

  protected readonly opciones = computed<OpcionSegmentado[]>(() => [
    { valor: 'proximos', texto: `Próximos · ${this.proximos().length}` },
    { valor: 'historial', texto: 'Historial' },
  ]);

  /** El turno que se está por cancelar; abre el diálogo. */
  protected readonly aCancelar = signal<AppointmentResponse | null>(null);
  protected readonly cancelando = signal(false);
  protected readonly errorCancelar = signal('');
  /** Mensaje que queda arriba de la lista después de cancelar. */
  protected readonly aviso = signal('');

  ngOnInit(): void {
    this.cargar();
  }

  protected cargar(): void {
    this.estado.set('cargando');
    this.appointments
      .misTurnos()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (turnos) => {
          this.ahora.set(new Date());
          this.turnos.set(turnos);
          this.estado.set('listo');
        },
        error: () => this.estado.set('error'),
      });
  }

  /** "Hoy · mié 29 oct", "Mañana · jue 30 oct" o null para los demás días. */
  protected relativo(turno: AppointmentResponse): string | null {
    const dias = Math.round(
      (inicioDelDia(new Date(turno.startDatetime)) - inicioDelDia(this.ahora())) / DIA,
    );
    if (dias === 0) return 'Hoy';
    if (dias === 1) return 'Mañana';
    return null;
  }

  protected minutos(turno: AppointmentResponse): number {
    return (
      (new Date(turno.endDatetime).getTime() - new Date(turno.startDatetime).getTime()) / MINUTO
    );
  }

  protected titulo(turno: AppointmentResponse): string {
    return turno.businessName ? `${turno.serviceName} · ${turno.businessName}` : turno.serviceName;
  }

  protected sePuedeCancelar(turno: AppointmentResponse): boolean {
    return sePuedeCancelar(turno, this.ahora());
  }

  protected seDevuelve(turno: AppointmentResponse): boolean {
    return seDevuelveLaSena(turno, this.ahora());
  }

  protected limite(turno: AppointmentResponse): Date {
    return limiteDevolucion(turno);
  }

  /** "hoy", "mañana" o null, para "Si cancelás hoy antes de las 11:00…". */
  protected diaDelLimite(turno: AppointmentResponse): string | null {
    const dias = Math.round((inicioDelDia(this.limite(turno)) - inicioDelDia(this.ahora())) / DIA);
    if (dias === 0) return 'hoy';
    if (dias === 1) return 'mañana';
    return null;
  }

  /** Qué pasó con la seña de un turno del historial, si hay algo que contar. */
  protected sena(turno: AppointmentResponse): string | null {
    switch (turno.deposit?.status) {
      case 'REFUNDED':
        return 'Seña devuelta';
      case 'FORFEITED':
        return 'Seña perdida';
      default:
        return null;
    }
  }

  protected pedirCancelar(turno: AppointmentResponse): void {
    // la regla de 24 h se mide contra este momento, no contra el de la carga
    this.ahora.set(new Date());
    this.errorCancelar.set('');
    this.aCancelar.set(turno);
  }

  protected cerrarCancelar(): void {
    this.aCancelar.set(null);
  }

  protected confirmarCancelar(): void {
    const turno = this.aCancelar();
    // el botón se deshabilita mientras cancela, pero se cuida igual de un segundo envío
    if (!turno || this.cancelando()) return;

    this.cancelando.set(true);
    this.errorCancelar.set('');
    this.appointments
      .cancelar(turno.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (cancelado) => {
          // si el back no manda la seña, se mantiene la que había y se usa la regla de 24 h
          const deposit = cancelado.deposit ?? turno.deposit;
          const devuelta = cancelado.deposit
            ? cancelado.deposit.status === 'REFUNDED'
            : this.seDevuelve(turno);
          this.turnos.update((turnos) =>
            turnos.map((t) => (t.id === turno.id ? { ...t, ...cancelado, deposit } : t)),
          );
          this.aviso.set(
            devuelta
              ? 'Cancelaste el turno. Te devolvemos la seña.'
              : 'Cancelaste el turno. La seña no se devuelve.',
          );
          this.cancelando.set(false);
          this.aCancelar.set(null);
        },
        error: (error: ApiError) => {
          this.cancelando.set(false);
          this.errorCancelar.set(error.message || 'No pudimos cancelar el turno. Probá de nuevo.');
        },
      });
  }
}
