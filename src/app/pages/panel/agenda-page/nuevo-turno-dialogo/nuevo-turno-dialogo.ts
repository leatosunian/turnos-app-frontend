import { formatDate } from '@angular/common';
import {
  Component,
  LOCALE_ID,
  OnInit,
  computed,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { ApiError } from '../../../../core/models/api-error';
import { ServResponse } from '../../../../core/models/servicio';
import { AppointmentResponse, CreateAppointmentRequest } from '../../../../core/models/turno';
import { UserResponse } from '../../../../core/models/usuario';
import { AppointmentService } from '../../../../core/services/appointment-service';
import { Boton } from '../../../../shared/components/boton/boton';
import { Campo } from '../../../../shared/components/campo/campo';
import { Dialogo } from '../../../../shared/components/dialogo/dialogo';
import { OpcionSegmentado, Segmentado } from '../../../../shared/components/segmentado/segmentado';
import { MontoPipe } from '../../../../shared/pipes/monto-pipe';
import { horaDe, horasDeLaFila, rangoDelTurno, turnoQueChoca } from '../agenda';

// Con que se abre el dialogo: el dia y la fila donde se toco el "+"
export interface AperturaNuevoTurno {
  // el dia en formato aaaa-mm-dd y como fecha, para el titulo
  clave: string;
  fecha: Date;
  // la hora de la fila, por ejemplo 10:00, y cuanto dura la fila en minutos
  hora: string;
  intervalo: number;
  // si en la Agenda estaba filtrado un profesional, el turno arranca con ese elegido
  empleadoId: string | null;
}

// Si el turno queda libre o se carga a nombre de un cliente
type Modo = 'libre' | 'cliente';

const MODOS: OpcionSegmentado[] = [
  { valor: 'libre', texto: 'Libre' },
  { valor: 'cliente', texto: 'Para un cliente' },
];

// las mismas reglas que valida el back, asi el error aparece antes de mandar.
// El telefono acepta de 7 a 20 caracteres entre digitos, espacios, + y -
const PATRON_TELEFONO = /^[0-9+\-\s]{7,20}$/;
// alcanza con que tenga algo, una arroba, algo, un punto y algo: ana@mail.com pasa y ana@mail no
const PATRON_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Alta de un turno suelto desde la Agenda (AgendaPage), en el dia y la fila donde el dueño toco
// el "+". Se elige la hora (de a 5 minutos dentro de la fila), el servicio y el profesional, y
// si queda libre para que lo reserve cualquiera o si ya se carga a nombre de un cliente.
// Antes de mandar revisa que no se pise con otro turno del mismo profesional, con la misma regla
// que el back, asi el dueño ve el problema sin esperar el 409.
@Component({
  selector: 'app-nuevo-turno-dialogo',
  imports: [Boton, Campo, Dialogo, MontoPipe, RouterLink, Segmentado],
  templateUrl: './nuevo-turno-dialogo.html',
})
export class NuevoTurnoDialogo implements OnInit {
  readonly businessId = input.required<string>();
  readonly apertura = input.required<AperturaNuevoTurno>();
  readonly servicios = input.required<ServResponse[]>();
  readonly equipo = input.required<UserResponse[]>();
  // todos los turnos de ese dia, sin el filtro de profesional, para revisar los choques
  readonly turnosDelDia = input.required<AppointmentResponse[]>();
  // se puede pasar en los tests; si no, es la hora del momento
  readonly ahora = input<Date>(new Date());

  readonly guardado = output<AppointmentResponse>();
  readonly cancelado = output<void>();

  private readonly turnosApi = inject(AppointmentService);
  private readonly locale = inject(LOCALE_ID);

  protected readonly modos = MODOS;

  protected readonly hora = signal('');
  protected readonly servicioId = signal('');
  // vacio es "Sin asignar"
  protected readonly empleadoId = signal('');
  protected readonly modo = signal<string>('libre');
  protected readonly nombre = signal('');
  protected readonly email = signal('');
  protected readonly telefono = signal('');

  protected readonly guardando = signal(false);
  protected readonly errorServidor = signal<string | null>(null);
  // los errores de los campos del cliente se muestran recien despues del primer intento de
  // guardar, asi no aparece "falta el nombre" apenas se elige "Para un cliente"
  protected readonly intento = signal(false);

  // Por ejemplo "Nuevo turno · Lunes 16 de noviembre"
  protected readonly titulo = computed(() => {
    const fecha = formatDate(this.apertura().fecha, "EEEE d 'de' MMMM", this.locale);
    return `Nuevo turno · ${fecha.charAt(0).toUpperCase()}${fecha.slice(1)}`;
  });

  // Las horas que se pueden elegir: de a 5 minutos dentro de la fila y solo las que no pasaron.
  // Por ejemplo en la fila de las 10:00 de a 30 da 10:00, 10:05 y asi hasta 10:25
  protected readonly horas = computed(() => {
    const { clave, hora, intervalo } = this.apertura();
    return horasDeLaFila(clave, hora, intervalo, this.ahora());
  });

  protected readonly servicio = computed(
    () => this.servicios().find((s) => s.id === this.servicioId()) ?? null,
  );

  protected readonly paraCliente = computed(() => (this.modo() as Modo) === 'cliente');

  // El inicio y el fin como los va a guardar el back, o null si falta elegir algo
  private readonly rango = computed(() => {
    const servicio = this.servicio();
    if (!servicio || !this.hora()) return null;
    return rangoDelTurno(this.apertura().clave, this.hora(), servicio.durationMinutes);
  });

  protected readonly horaFin = computed(() => {
    const rango = this.rango();
    return rango ? horaDe(rango.endDatetime) : '';
  });

  // Si se pisa con otro turno del mismo profesional, el texto para avisarlo. Por ejemplo
  // "Se pisa con el turno de Ana Prueba de 10:00 a 10:45."
  protected readonly choque = computed(() => {
    const rango = this.rango();
    if (!rango) return null;
    const otro = turnoQueChoca(
      { ...rango, employeeId: this.empleadoId() || null },
      this.turnosDelDia(),
    );
    if (!otro) return null;
    const quien = otro.clientName ? `el turno de ${otro.clientName}` : 'un turno libre';
    return `Se pisa con ${quien} de ${horaDe(otro.startDatetime)} a ${horaDe(otro.endDatetime)}.`;
  });

  protected readonly errorNombre = computed(() => {
    if (!this.paraCliente() || !this.intento()) return null;
    if (!this.nombre().trim()) return 'Ingresá el nombre del cliente.';
    if (this.nombre().trim().length > 100) return 'El nombre puede tener hasta 100 caracteres.';
    return null;
  });

  protected readonly errorEmail = computed(() => {
    const email = this.email().trim();
    if (!this.paraCliente() || !this.intento() || !email) return null;
    return PATRON_EMAIL.test(email) ? null : 'El email no es válido.';
  });

  protected readonly errorTelefono = computed(() => {
    const telefono = this.telefono().trim();
    if (!this.paraCliente() || !this.intento() || !telefono) return null;
    return PATRON_TELEFONO.test(telefono)
      ? null
      : 'Ingresá entre 7 y 20 caracteres: números, espacios, + o -.';
  });

  ngOnInit(): void {
    // arranca en la primera hora libre de la fila, con el primer servicio y, si la Agenda estaba
    // filtrada por un profesional, con ese profesional
    this.hora.set(this.horas()[0] ?? '');
    this.servicioId.set(this.servicios()[0]?.id ?? '');
    const empleado = this.apertura().empleadoId;
    if (empleado && this.equipo().some((e) => e.id === empleado)) this.empleadoId.set(empleado);
  }

  protected guardar(): void {
    this.intento.set(true);
    this.errorServidor.set(null);
    const rango = this.rango();
    if (
      !rango ||
      this.choque() ||
      this.errorNombre() ||
      this.errorEmail() ||
      this.errorTelefono() ||
      this.guardando()
    ) {
      return;
    }

    const pedido: CreateAppointmentRequest = {
      startDatetime: rango.startDatetime,
      serviceId: this.servicioId(),
      employeeId: this.empleadoId() || null,
    };
    // los datos del cliente van solo si se eligio "Para un cliente", y los vacios no se mandan
    if (this.paraCliente()) {
      pedido.clientName = this.nombre().trim();
      if (this.email().trim()) pedido.clientEmail = this.email().trim();
      if (this.telefono().trim()) pedido.clientPhone = this.telefono().trim();
    }

    this.guardando.set(true);
    this.turnosApi.crear(this.businessId(), pedido).subscribe({
      next: (turno) => this.guardado.emit(turno),
      error: (error: ApiError) => {
        // por ejemplo el 409 si mientras tanto alguien cargo otro turno en ese horario
        this.guardando.set(false);
        this.errorServidor.set(error.message);
      },
    });
  }
}
