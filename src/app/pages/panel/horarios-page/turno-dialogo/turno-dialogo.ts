import { Component, OnInit, computed, inject, input, output, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ApiError } from '../../../../core/models/api-error';
import {
  AppointmentScheduleRequest,
  AppointmentScheduleResponse,
  DayScheduleResponse,
} from '../../../../core/models/horario';
import { ServResponse } from '../../../../core/models/servicio';
import { UserResponse } from '../../../../core/models/usuario';
import { HorarioService } from '../../../../core/services/horario-service';
import { Boton } from '../../../../shared/components/boton/boton';
import { Campo } from '../../../../shared/components/campo/campo';
import { Dialogo } from '../../../../shared/components/dialogo/dialogo';
import { MontoPipe } from '../../../../shared/pipes/monto-pipe';
import { DIAS, aHora, aMinutos, conHora, errorDeTurno, horaCorta, seSuperponen } from '../horarios';

// Con que se abre el dialogo. turno es null para crear uno nuevo, y horaInicial es la hora de la
// fila donde se toco el "+" (o la del turno que se edita)
export interface AperturaTurno {
  dayNumber: number;
  turno: AppointmentScheduleResponse | null;
  horaInicial: string;
}

// las horas de inicio y fin se eligen de a 5 minutos, que es lo minimo que acepta el back
// para un intervalo y alcanza para cualquier servicio
const PASO = 5;

// Alta y edicion de un turno programado de la plantilla semanal. Lo abre HorariosPage desde el
// "+" de una fila de la grilla o tocando una tarjeta. Valida en el momento lo mismo que el back
// (que el rango alcance para el servicio y que no choque con otro del mismo profesional) asi el
// dueño ve el problema antes de guardar.
@Component({
  selector: 'app-turno-dialogo',
  imports: [Boton, Campo, Dialogo, MontoPipe, RouterLink],
  templateUrl: './turno-dialogo.html',
})
export class TurnoDialogo implements OnInit {
  readonly businessId = input.required<string>();
  readonly apertura = input.required<AperturaTurno>();
  // el horario de atencion del dia, para limitar las horas y validar que el turno entre
  readonly dia = input.required<DayScheduleResponse>();
  readonly servicios = input.required<ServResponse[]>();
  readonly equipo = input.required<UserResponse[]>();
  // toda la plantilla, para avisar si el turno choca con otro
  readonly plantilla = input.required<AppointmentScheduleResponse[]>();
  // cambia el texto de abajo: con la agenda automatica apagada el turno solo queda guardado
  readonly agendaAutomatica = input(false);

  readonly guardado = output<AppointmentScheduleResponse>();
  readonly eliminar = output<AppointmentScheduleResponse>();
  readonly cancelado = output<void>();

  private readonly horarios = inject(HorarioService);

  protected readonly servicioId = signal('');
  // vacio es "Sin asignar"
  protected readonly empleadoId = signal('');
  protected readonly inicio = signal('');
  protected readonly fin = signal('');

  protected readonly guardando = signal(false);
  protected readonly errorServidor = signal<string | null>(null);

  protected readonly editando = computed(() => this.apertura().turno !== null);
  protected readonly titulo = computed(
    () =>
      `${this.editando() ? 'Editar turno' : 'Nuevo turno'} · ${DIAS[this.apertura().dayNumber].largo}`,
  );

  protected readonly servicio = computed(
    () => this.servicios().find((s) => s.id === this.servicioId()) ?? null,
  );

  // Horas de inicio posibles: de a 5 minutos dentro del horario del dia. Si el turno que se edita
  // arranca fuera del horario (porque despues se achico el dia) se agrega igual, si no el select
  // no podria mostrar su valor actual
  protected readonly horasInicio = computed(() => {
    const dia = this.dia();
    const desde = aMinutos(dia.dayStart ?? '00:00');
    const hasta = aMinutos(dia.dayEnd ?? '23:55');
    return conHora(rango(desde, hasta - PASO), this.inicio());
  });

  // Horas de fin posibles: desde 5 minutos despues del inicio hasta el cierre del dia
  protected readonly horasFin = computed(() => {
    const hasta = aMinutos(this.dia().dayEnd ?? '23:55');
    return conHora(rango(aMinutos(this.inicio() || '00:00') + PASO, hasta), this.fin());
  });

  // El primer problema que tenga el turno, o null si se puede guardar
  protected readonly problema = computed(() => {
    const servicio = this.servicio();
    if (!servicio || !this.inicio() || !this.fin()) return null;
    const error = errorDeTurno(this.inicio(), this.fin(), servicio.durationMinutes, this.dia());
    if (error) return error;

    const propio = this.apertura().turno?.id;
    const choque = this.plantilla().find(
      (otro) => otro.id !== propio && seSuperponen(this.pedido(), otro),
    );
    if (!choque) return null;
    const nombre = this.servicios().find((s) => s.id === choque.serviceId)?.name ?? 'otro turno';
    const quien = this.empleadoId() ? 'del mismo profesional' : 'que tampoco tiene profesional';
    return `Se pisa con ${nombre} de ${horaCorta(choque.startTime)} a ${horaCorta(choque.endTime)}, ${quien}.`;
  });

  ngOnInit(): void {
    const { turno, horaInicial } = this.apertura();
    if (turno) {
      this.servicioId.set(turno.serviceId);
      this.empleadoId.set(turno.employeeId ?? '');
      this.inicio.set(horaCorta(turno.startTime));
      this.fin.set(horaCorta(turno.endTime));
      return;
    }
    // uno nuevo arranca con el primer servicio y termina cuando termina ese servicio
    this.servicioId.set(this.servicios()[0]?.id ?? '');
    this.inicio.set(horaInicial);
    this.ajustarFin();
  }

  protected cambiarServicio(id: string): void {
    this.servicioId.set(id);
    this.ajustarFin();
  }

  protected cambiarInicio(hora: string): void {
    this.inicio.set(hora);
    this.ajustarFin();
  }

  // Al cambiar el servicio o la hora de inicio, el fin pasa a ser inicio mas lo que dura el
  // servicio, que es lo que el dueño quiere casi siempre. Por ejemplo un Corte de 45 que
  // arranca 10:00 termina 10:45. Despues lo puede cambiar a mano si quiere dejar un margen.
  // Si se pasaria de la medianoche no lo tocamos y que lo marque la validacion
  private ajustarFin(): void {
    const servicio = this.servicio();
    if (!servicio || !this.inicio()) return;
    const fin = aMinutos(this.inicio()) + servicio.durationMinutes;
    if (fin < 24 * 60) this.fin.set(aHora(fin));
  }

  private pedido(): AppointmentScheduleRequest {
    return {
      dayNumber: this.apertura().dayNumber,
      startTime: this.inicio(),
      endTime: this.fin(),
      serviceId: this.servicioId(),
      employeeId: this.empleadoId() || null,
    };
  }

  protected guardar(): void {
    this.errorServidor.set(null);
    if (!this.servicio() || this.problema() || this.guardando()) return;

    const turno = this.apertura().turno;
    const pedido = turno
      ? this.horarios.editarTurnoProgramado(this.businessId(), turno.id, this.pedido())
      : this.horarios.crearTurnoProgramado(this.businessId(), this.pedido());

    this.guardando.set(true);
    pedido.subscribe({
      next: (guardado) => this.guardado.emit(guardado),
      error: (error: ApiError) => {
        // por ejemplo el 409 si mientras tanto alguien cargo otro turno en ese horario
        this.guardando.set(false);
        this.errorServidor.set(error.message);
      },
    });
  }

  protected pedirEliminar(): void {
    const turno = this.apertura().turno;
    if (turno && !this.guardando()) this.eliminar.emit(turno);
  }
}

// Las horas de a 5 minutos entre dos momentos del dia (en minutos), los dos incluidos.
// Por ejemplo rango(600, 615) da 10:00, 10:05, 10:10 y 10:15
function rango(desde: number, hasta: number): string[] {
  const horas: string[] = [];
  for (let minutos = desde; minutos <= hasta; minutos += PASO) horas.push(aHora(minutos));
  return horas;
}
