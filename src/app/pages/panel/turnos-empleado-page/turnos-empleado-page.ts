import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Subscription } from 'rxjs';
import { ApiError } from '../../../core/models/api-error';
import { AppointmentResponse, AppointmentStatus } from '../../../core/models/turno';
import {
  AppointmentService,
  FiltroTurnosEmpleado,
} from '../../../core/services/appointment-service';
import { AuthService } from '../../../core/services/auth-service';
import { AvisoVacio } from '../../../shared/components/aviso-vacio/aviso-vacio';
import { Boton } from '../../../shared/components/boton/boton';
import { EstadoTurno } from '../../../shared/components/estado-turno/estado-turno';
import { OpcionSegmentado, Segmentado } from '../../../shared/components/segmentado/segmentado';
import { FechaPipe } from '../../../shared/pipes/fecha-pipe';
import { HoraPipe } from '../../../shared/pipes/hora-pipe';
import { claveDia, sumarDias } from '../agenda-page/agenda';
import { agruparPorDia } from '../turnos-page/turnos-page';

type Periodo = 'proximos' | 'anteriores';

const PERIODOS: OpcionSegmentado[] = [
  { valor: 'proximos', texto: 'Próximos' },
  { valor: 'anteriores', texto: 'Anteriores' },
];

// Las opciones del select de estado. El valor vacio es "todos", porque un select no maneja null
const ESTADOS: { valor: AppointmentStatus | ''; texto: string }[] = [
  { valor: '', texto: 'Todos los estados' },
  { valor: 'BOOKED', texto: 'Reservados' },
  { valor: 'AWAITING_PAYMENT', texto: 'Esperando seña' },
  { valor: 'UNBOOKED', texto: 'Libres' },
  { valor: 'SUSPENDED', texto: 'Suspendidos' },
  { valor: 'CANCELLED', texto: 'Cancelados' },
];

const POR_PAGINA = 20;

// Pantalla Mis turnos (/panel/mis-turnos), la agenda del empleado. Muestra solo los turnos que
// tiene asignados, agrupados por dia, sin poder crear, suspender ni eliminar nada: eso lo hace
// el dueño desde la Agenda. Los datos salen de GET /employees/me/appointments, que filtra por el
// empleado del token, asi que no hace falta mandar ni el negocio ni el id del empleado.
// Proximos arranca hoy a las 00:00 y va del mas cercano al mas lejano, asi lo primero que se ve
// es lo que viene. Anteriores termina ayer y va al reves, del mas reciente para atras
@Component({
  imports: [AvisoVacio, Boton, EstadoTurno, FechaPipe, HoraPipe, Segmentado],
  selector: 'app-turnos-empleado-page',
  templateUrl: './turnos-empleado-page.html',
})
export class TurnosEmpleadoPage implements OnInit {
  private readonly turnosApi = inject(AppointmentService);
  private readonly auth = inject(AuthService);
  private readonly destroyRef = inject(DestroyRef);
  private pedido?: Subscription;

  protected readonly periodos = PERIODOS;
  protected readonly estados = ESTADOS;

  protected readonly periodo = signal<Periodo>('proximos');
  protected readonly estado = signal<AppointmentStatus | ''>('');
  protected readonly turnos = signal<AppointmentResponse[]>([]);
  protected readonly pagina = signal(0);
  protected readonly total = signal(0);
  protected readonly totalPaginas = signal(0);
  // 'lista' es cuando se pide la primera pagina (al entrar o al cambiar un filtro) y 'mas'
  // cuando se suma una pagina con el boton de abajo, para mostrar un esqueleto o el boton girando
  protected readonly cargando = signal<'lista' | 'mas' | null>('lista');
  protected readonly error = signal('');

  protected readonly negocio = computed(() => this.auth.usuario()?.businessName ?? '');
  protected readonly grupos = computed(() => agruparPorDia(this.turnos()));
  protected readonly hayMas = computed(() => this.pagina() + 1 < this.totalPaginas());

  ngOnInit(): void {
    this.cargar(0);
  }

  protected elegirPeriodo(valor: string): void {
    if (valor === this.periodo()) return;
    this.periodo.set(valor as Periodo);
    this.cargar(0);
  }

  protected elegirEstado(valor: string): void {
    this.estado.set(valor as AppointmentStatus | '');
    this.cargar(0);
  }

  protected cargarMas(): void {
    this.cargar(this.pagina() + 1);
  }

  protected reintentar(): void {
    this.cargar(0);
  }

  // Lo que se muestra debajo del nombre del cliente para poder contactarlo: el telefono si lo
  // dejo y si no el email. Un turno libre no tiene ninguno de los dos y queda vacio
  protected contacto(turno: AppointmentResponse): string {
    return turno.clientPhone ?? turno.clientEmail ?? '';
  }

  // Pide una pagina. La 0 reemplaza la lista (cambio de filtro) y las demas se suman abajo.
  // Si habia un pedido en curso se corta, asi un filtro tocado rapido dos veces no mezcla listas
  private cargar(numero: number): void {
    this.pedido?.unsubscribe();
    this.cargando.set(numero === 0 ? 'lista' : 'mas');
    this.error.set('');
    if (numero === 0) this.turnos.set([]);

    this.pedido = this.turnosApi
      .deEmpleado({ ...this.filtro(), page: numero, size: POR_PAGINA })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (pagina) => {
          this.turnos.update((actuales) =>
            numero === 0 ? pagina.items : [...actuales, ...pagina.items],
          );
          this.pagina.set(numero);
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

  // Arma los filtros del pedido segun el periodo elegido. hoy sale de la fecha local y no de
  // toISOString, que da la fecha en UTC: a las 22 hs de Argentina ya seria el dia siguiente.
  // Por ejemplo el 13/11 Proximos pide desde 2026-11-13 y Anteriores hasta 2026-11-12
  private filtro(): FiltroTurnosEmpleado {
    const hoy = new Date();
    const status = this.estado() || null;
    return this.periodo() === 'proximos'
      ? { status, desde: claveDia(hoy), sort: 'startDatetime,asc' }
      : { status, hasta: claveDia(sumarDias(hoy, -1)), sort: 'startDatetime,desc' };
  }
}
