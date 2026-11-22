import { Component, computed, inject, input, output, signal } from '@angular/core';
import { ApiError } from '../../../../core/models/api-error';
import { AppointmentResponse, DepositStatus } from '../../../../core/models/turno';
import { AppointmentService } from '../../../../core/services/appointment-service';
import { Boton } from '../../../../shared/components/boton/boton';
import { Dialogo } from '../../../../shared/components/dialogo/dialogo';
import { EstadoTurno } from '../../../../shared/components/estado-turno/estado-turno';
import { FechaPipe } from '../../../../shared/pipes/fecha-pipe';
import { MontoPipe } from '../../../../shared/pipes/monto-pipe';
import { horaDe } from '../agenda';

// Como se nombra el estado de la seña en el detalle, igual que en el panel Hoy
const TEXTO_SENA: Record<DepositStatus, string> = {
  PENDING: 'Pendiente de pago',
  PAID: 'Pagada',
  REFUNDED: 'Devuelta',
  FORFEITED: 'Retenida por el negocio',
  CANCELED: 'Cancelada',
};

// Detalle de un turno de la Agenda (AgendaPage), que se abre al tocar su tarjeta.
// Si el turno tiene cliente (reservado, esperando la seña, cancelado o suspendido) muestra los
// datos del turno y los de la reserva: quien es, como contactarlo y como esta la seña.
// Si esta libre muestra los datos del turno y deja eliminarlo. El back solo borra turnos libres,
// y antes de mandar el DELETE se pide confirmacion dentro del mismo dialogo, asi no se apilan
// dos ventanas una arriba de la otra.
@Component({
  selector: 'app-detalle-turno-dialogo',
  imports: [Boton, Dialogo, EstadoTurno, FechaPipe, MontoPipe],
  templateUrl: './detalle-turno-dialogo.html',
})
export class DetalleTurnoDialogo {
  readonly turno = input.required<AppointmentResponse>();
  // se puede pasar en los tests; si no, es la hora del momento. Sirve para el chip de estado,
  // que distingue confirmado, en curso y terminado comparando con la hora
  readonly ahora = input<Date>(new Date());

  // avisa el id del turno borrado, para que la agenda lo saque de la lista
  readonly eliminado = output<string>();
  readonly cerrado = output<void>();

  private readonly turnosApi = inject(AppointmentService);

  protected readonly horaDe = horaDe;

  // true mientras se muestra la pregunta de si de verdad se quiere eliminar
  protected readonly confirmando = signal(false);
  protected readonly eliminando = signal(false);
  protected readonly error = signal<string | null>(null);

  protected readonly libre = computed(() => this.turno().status === 'UNBOOKED');

  // Cuanto dura en minutos, por ejemplo de 16:30 a 17:15 da 45
  protected readonly duracion = computed(() => {
    const { startDatetime, endDatetime } = this.turno();
    return Math.round(
      (new Date(endDatetime).getTime() - new Date(startDatetime).getTime()) / 60_000,
    );
  });

  protected readonly profesional = computed(() => this.turno().employeeName ?? 'Sin asignar');

  protected readonly textoSena = computed(() => {
    const sena = this.turno().deposit;
    return sena ? TEXTO_SENA[sena.status] : null;
  });

  // Por ejemplo "Lucia Gomez" en el titulo de un reservado, o "Turno libre"
  protected readonly titulo = computed(() =>
    this.libre() ? 'Turno libre' : (this.turno().clientName ?? 'Turno reservado'),
  );

  protected pedirEliminar(): void {
    this.error.set(null);
    this.confirmando.set(true);
  }

  protected volver(): void {
    if (!this.eliminando()) this.confirmando.set(false);
  }

  protected eliminar(): void {
    if (this.eliminando()) return;
    this.eliminando.set(true);
    this.error.set(null);
    const id = this.turno().id;
    this.turnosApi.eliminar(id).subscribe({
      next: () => this.eliminado.emit(id),
      error: (error: ApiError) => {
        // por ejemplo si alguien lo reservo mientras tanto, el back ya no lo deja borrar
        this.eliminando.set(false);
        this.error.set(error.message);
      },
    });
  }
}
