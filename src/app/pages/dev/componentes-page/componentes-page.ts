import { Component, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AppointmentResponse } from '../../../core/models/turno';
import { AvisoVacio } from '../../../shared/components/aviso-vacio/aviso-vacio';
import { Boton } from '../../../shared/components/boton/boton';
import { Campo } from '../../../shared/components/campo/campo';
import { EstadoTurno } from '../../../shared/components/estado-turno/estado-turno';
import { Interruptor } from '../../../shared/components/interruptor/interruptor';
import { Pastilla } from '../../../shared/components/pastilla/pastilla';
import { OpcionSegmentado, Segmentado } from '../../../shared/components/segmentado/segmentado';
import { Slot } from '../../../shared/components/slot/slot';

type TurnoDeEjemplo = Pick<AppointmentResponse, 'status' | 'startDatetime' | 'endDatetime'>;

const hace = (minutos: number) => new Date(Date.now() - minutos * 60_000).toISOString();

// catálogo para el equipo: muestra cada componente compartido con sus variantes
@Component({
  imports: [
    AvisoVacio,
    Boton,
    Campo,
    EstadoTurno,
    Interruptor,
    Pastilla,
    RouterLink,
    Segmentado,
    Slot,
  ],
  selector: 'app-componentes-page',
  styleUrl: './componentes-page.css',
  templateUrl: './componentes-page.html',
})
export class ComponentesPage {
  protected readonly turnos: TurnoDeEjemplo[] = [
    { status: 'UNBOOKED', startDatetime: hace(-60), endDatetime: hace(-90) },
    { status: 'AWAITING_PAYMENT', startDatetime: hace(-60), endDatetime: hace(-90) },
    { status: 'BOOKED', startDatetime: hace(-60), endDatetime: hace(-90) },
    { status: 'BOOKED', startDatetime: hace(15), endDatetime: hace(-30) },
    { status: 'BOOKED', startDatetime: hace(90), endDatetime: hace(45) },
    { status: 'CANCELLED', startDatetime: hace(-60), endDatetime: hace(-90) },
    { status: 'SUSPENDED', startDatetime: hace(-60), endDatetime: hace(-90) },
  ];

  protected readonly horarios = ['09:00', '09:30', '10:00', '10:30', '11:00'];
  protected readonly ocupados = ['09:30'];
  protected readonly horario = signal('10:00');

  protected readonly vistas: OpcionSegmentado[] = [
    { valor: 'dia', texto: 'Día' },
    { valor: 'semana', texto: 'Semana' },
    { valor: 'mes', texto: 'Mes' },
  ];
  protected readonly vista = signal('semana');

  protected readonly atiendeSabados = signal(true);
  protected readonly atiendeDomingos = signal(false);

  protected readonly guardando = signal(false);

  protected guardar() {
    this.guardando.set(true);
    setTimeout(() => this.guardando.set(false), 1500);
  }
}
