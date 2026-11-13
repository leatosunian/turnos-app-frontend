import { NgTemplateOutlet } from '@angular/common';
import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { Subject, catchError, concatMap, forkJoin, map, of, switchMap } from 'rxjs';
import { ApiError } from '../../../core/models/api-error';
import {
  AppointmentScheduleResponse,
  DayScheduleResponse,
  DayScheduleUpdateRequest,
} from '../../../core/models/horario';
import { BusinessResponse } from '../../../core/models/negocio';
import { ServResponse } from '../../../core/models/servicio';
import { UserResponse } from '../../../core/models/usuario';
import { AppointmentService } from '../../../core/services/appointment-service';
import { EmpleadoService } from '../../../core/services/empleado-service';
import { HorarioService } from '../../../core/services/horario-service';
import { NegocioService } from '../../../core/services/negocio-service';
import { ServicioService } from '../../../core/services/servicio-service';
import { MenuMasEstado } from '../../../layouts/private-layout/menu-mas/menu-mas-estado';
import { AvisoVacio } from '../../../shared/components/aviso-vacio/aviso-vacio';
import { Boton } from '../../../shared/components/boton/boton';
import { Campo } from '../../../shared/components/campo/campo';
import { Confirmacion } from '../../../shared/components/confirmacion/confirmacion';
import { Interruptor } from '../../../shared/components/interruptor/interruptor';
import { FechaPipe } from '../../../shared/pipes/fecha-pipe';
import { MontoPipe } from '../../../shared/pipes/monto-pipe';
import {
  ANTICIPACION,
  DIAS,
  DIAS_A_CREAR,
  DIA_POR_DEFECTO,
  INTERVALOS,
  TonoProfesional,
  aMinutos,
  armarGrilla,
  conHora,
  erroresDeAgenda,
  horaCorta,
  mensajeDeGeneracion,
  mensajeDeLote,
  opcionesDeHora,
  ordenarSemana,
  pedidoDeNegocio,
  proximaRenovacion,
  tonoDeProfesional,
  turnosPorSemana,
} from './horarios';
import { FinDeLote, LoteDialogo } from './lote-dialogo/lote-dialogo';
import { AperturaTurno, TurnoDialogo } from './turno-dialogo/turno-dialogo';

type EstadoCarga = 'cargando' | 'listo' | 'sin-negocio' | 'error';

// En que anda el guardado del dia elegido, para el cartelito al lado de los selectores
type EstadoGuardado = 'quieto' | 'guardando' | 'guardado' | 'error';

// Las clases de cada color de tarjeta. El fondo y el borde van suaves para que con muchos
// turnos la grilla no quede cargada, y el punto lleva el color fuerte para la leyenda
const CLASES_TONO: Record<TonoProfesional, { tarjeta: string; punto: string }> = {
  ambar: { tarjeta: 'border-accent-line bg-accent-soft', punto: 'bg-accent' },
  menta: { tarjeta: 'border-success-line bg-success-soft', punto: 'bg-success' },
  cielo: { tarjeta: 'border-info-line bg-info-soft', punto: 'bg-info' },
  coral: { tarjeta: 'border-danger-line bg-danger-soft', punto: 'bg-danger' },
  neutro: { tarjeta: 'border-line-strong bg-surface-2', punto: 'bg-idle' },
};

// Cuanto se espera despues de la ultima tecla en los campos de la agenda automatica antes de
// guardar. Sin esto, escribir 14 mandaria un guardado con 1 y otro con 14, y cada guardado le
// hace regenerar la agenda al back
const ESPERA_CAMPOS = 600;

// Un campo numerico a entero. El vacio da NaN y no 0 (que es lo que da Number('')), asi la
// validacion lo marca en vez de tomarlo como cero dias de anticipacion
function aEntero(valor: string): number {
  return valor.trim() === '' ? Number.NaN : Number(valor);
}

// Pantalla de Horarios y plantillas (/panel/horarios), solo para el dueño. Arriba van las
// pestañas de los dias; en cada dia se configura el horario de atencion (abierto o cerrado,
// desde, hasta y cada cuanto se parte la grilla) y abajo la grilla con los turnos programados
// de la plantilla semanal. Al final esta la agenda automatica, que es la que publica los turnos
// de la plantilla en la pagina del negocio. Todo se guarda solo, sin boton de guardar.
@Component({
  imports: [
    AvisoVacio,
    Boton,
    Campo,
    Confirmacion,
    FechaPipe,
    Interruptor,
    MontoPipe,
    NgTemplateOutlet,
    RouterLink,
    LoteDialogo,
    TurnoDialogo,
  ],
  selector: 'app-horarios-page',
  styleUrl: './horarios-page.css',
  templateUrl: './horarios-page.html',
})
export class HorariosPage implements OnInit {
  private readonly negocios = inject(NegocioService);
  private readonly horarios = inject(HorarioService);
  private readonly serviciosApi = inject(ServicioService);
  private readonly empleadosApi = inject(EmpleadoService);
  private readonly turnosApi = inject(AppointmentService);
  private readonly menuMas = inject(MenuMasEstado);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly dias = DIAS;
  protected readonly intervalos = INTERVALOS;
  protected readonly limitesDias = DIAS_A_CREAR;
  protected readonly limitesAnticipacion = ANTICIPACION;
  protected readonly horas = opcionesDeHora();
  protected readonly horaCorta = horaCorta;

  protected readonly estado = signal<EstadoCarga>('cargando');
  protected readonly errorCarga = signal('');
  protected readonly negocio = signal<BusinessResponse | null>(null);
  protected readonly semana = signal<DayScheduleResponse[]>([]);
  protected readonly plantilla = signal<AppointmentScheduleResponse[]>([]);
  protected readonly servicios = signal<ServResponse[]>([]);
  protected readonly equipo = signal<UserResponse[]>([]);

  // Arranca en el dia de hoy. getDay() da 0 para el domingo, asi que con + 6 y el resto de
  // dividir por 7 queda lunes 0 y domingo 6, igual que el dayNumber del back
  protected readonly diaElegido = signal((new Date().getDay() + 6) % 7);

  protected readonly guardado = signal<EstadoGuardado>('quieto');
  protected readonly errorGuardado = signal('');

  // El dialogo de alta o edicion de un turno programado, con lo que necesita para abrirse
  protected readonly apertura = signal<AperturaTurno | null>(null);
  protected readonly loteAbierto = signal(false);
  // el aviso verde (o rojo si algo fallo) que deja el lote al terminar
  protected readonly avisoLote = signal<{ ok: boolean; texto: string } | null>(null);
  protected readonly baja = signal<AppointmentScheduleResponse | null>(null);
  protected readonly procesandoBaja = signal(false);
  protected readonly errorBaja = signal('');

  // Copia de como quedo cada dia la ultima vez que el back lo confirmo. Si un guardado falla,
  // el dia vuelve a estos valores asi la pantalla no muestra algo que no se guardo
  private confirmados: DayScheduleResponse[] = [];

  // Agenda automatica. Los campos guardan lo que el dueño escribe tal cual (puede quedar vacio
  // o fuera de rango mientras escribe) y recien se validan al guardar
  protected readonly borradorDias = signal('');
  protected readonly borradorAnticipacion = signal('');
  protected readonly erroresAgenda = signal<{ dias: string | null; anticipacion: string | null }>({
    dias: null,
    anticipacion: null,
  });
  protected readonly guardadoAgenda = signal<EstadoGuardado>('quieto');
  protected readonly errorAgenda = signal('');
  protected readonly generando = signal(false);
  protected readonly resultadoGenerar = signal<{ ok: boolean; texto: string } | null>(null);

  // Lo mismo que confirmados pero para el negocio, por si falla un guardado de la agenda
  private negocioConfirmado: BusinessResponse | null = null;
  private esperaCampos: ReturnType<typeof setTimeout> | undefined;

  // Los guardados de la agenda van en fila, uno atras del otro: si el dueño prende el interruptor
  // y enseguida cambia los dias, el segundo PUT sale cuando volvio el primero. En paralelo el back
  // podria regenerar dos veces a la vez y pisarse
  private readonly colaAgenda = new Subject<BusinessResponse>();
  private pendientesAgenda = 0;

  protected readonly dia = computed(() => this.semana()[this.diaElegido()] ?? null);
  protected readonly infoDia = computed(() => DIAS[this.diaElegido()]);

  // Los turnos programados del dia elegido, ya repartidos en las filas de la grilla
  protected readonly grilla = computed(() => {
    const dia = this.dia();
    const turnos = this.plantilla().filter((t) => t.dayNumber === this.diaElegido());
    if (!dia?.dayStart || !dia.dayEnd) return { filas: [], fueraDeHorario: turnos };
    return armarGrilla(
      turnos,
      dia.dayStart,
      dia.dayEnd,
      dia.appointmentDuration ?? DIA_POR_DEFECTO.intervalo,
    );
  });

  // Para la pestaña y el subtitulo: cuantos turnos programados tiene cada dia
  protected readonly cantidadPorDia = computed(() => {
    const cantidades = DIAS.map(() => 0);
    for (const turno of this.plantilla()) cantidades[turno.dayNumber]++;
    return cantidades;
  });

  // Subtitulo del dia, por ejemplo "12 turnos · 10 h" o "Cerrado"
  protected readonly resumenDia = computed(() => {
    const dia = this.dia();
    const cantidad = this.cantidadPorDia()[this.diaElegido()];
    const turnos = `${cantidad} ${cantidad === 1 ? 'turno' : 'turnos'}`;
    if (!dia?.enabled || !dia.dayStart || !dia.dayEnd) return `Cerrado · ${turnos}`;
    const minutos = aMinutos(dia.dayEnd) - aMinutos(dia.dayStart);
    // las horas abiertas, con un decimal solo si hace falta: 600 min da 10 h y 570 da 9,5 h
    const horas = Number((minutos / 60).toFixed(1)).toLocaleString('es-AR');
    return `${turnos} · ${horas} h`;
  });

  // Las opciones de Hasta arrancan despues de Desde, asi no se puede elegir un fin antes del
  // inicio (el back lo rechazaria con 400)
  protected readonly horasHasta = computed(() => {
    const dia = this.dia();
    const desde = dia?.dayStart;
    const opciones = desde
      ? this.horas.filter((hora) => aMinutos(hora) > aMinutos(desde))
      : this.horas;
    return conHora(opciones, dia?.dayEnd ?? null);
  });

  // Las de Desde son todas, mas la hora actual del dia si no cae justo en un cuarto de hora
  protected readonly horasDesde = computed(() => conHora(this.horas, this.dia()?.dayStart ?? null));

  // Leyenda de colores: un item por profesional y uno para los turnos sin asignar
  protected readonly leyenda = computed(() => [
    ...this.equipo().map((empleado) => ({
      nombre: empleado.name,
      punto: CLASES_TONO[this.tono(empleado.id)].punto,
    })),
    { nombre: 'Sin asignar', punto: CLASES_TONO.neutro.punto },
  ]);

  private readonly nombresServicio = computed(
    () => new Map(this.servicios().map((servicio) => [servicio.id, servicio.name])),
  );
  private readonly nombresEmpleado = computed(
    () => new Map(this.equipo().map((empleado) => [empleado.id, empleado.name])),
  );

  // Para el resumen de la agenda automatica
  protected readonly turnosSemana = computed(() =>
    turnosPorSemana(this.plantilla(), this.semana()),
  );
  // Con la agenda apagada no hay renovacion, aunque haya quedado algo cargado de antes
  protected readonly renovacion = computed(() => {
    const negocio = this.negocio();
    if (!negocio?.automaticSchedule) return null;
    return proximaRenovacion(negocio.scheduleEnd, negocio.scheduleAnticipation);
  });

  constructor() {
    this.colaAgenda
      .pipe(
        concatMap((cambiado) =>
          this.negocios.actualizar(cambiado.id, pedidoDeNegocio(cambiado)).pipe(
            map((confirmado) => ({ confirmado, error: null })),
            // el error se pasa como un resultado mas, si no cortaria la fila para siempre
            catchError((error: ApiError) => of({ confirmado: null, error })),
          ),
        ),
        takeUntilDestroyed(),
      )
      .subscribe(({ confirmado, error }) => this.agendaRespondio(confirmado, error));
    this.destroyRef.onDestroy(() => clearTimeout(this.esperaCampos));
  }

  ngOnInit(): void {
    this.cargar();
  }

  protected cargar(): void {
    this.estado.set('cargando');
    this.negocios
      .miNegocio()
      .pipe(
        switchMap((negocio) => {
          // siempre el id de /businesses/mine: el back no controla que el negocio sea del usuario
          this.mostrarNegocio(negocio);
          return forkJoin({
            semana: this.horarios.semana(negocio.id),
            plantilla: this.horarios.plantilla(negocio.id),
            servicios: this.serviciosApi.listar(negocio.id),
            equipo: this.empleadosApi.listar(negocio.id),
          });
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: ({ semana, plantilla, servicios, equipo }) => {
          const ordenada = ordenarSemana(semana);
          this.semana.set(ordenada);
          this.confirmados = ordenada;
          this.plantilla.set(plantilla);
          this.servicios.set(servicios);
          this.equipo.set(equipo);
          this.estado.set('listo');
        },
        error: (error: ApiError) => {
          this.errorCarga.set(error.message);
          this.estado.set(error.status === 404 ? 'sin-negocio' : 'error');
        },
      });
  }

  // Link "‹ Más" del celular: vuelve al menu de donde se entro
  protected volverAMas(): void {
    this.menuMas.abrir();
  }

  protected elegirDia(numero: number): void {
    this.diaElegido.set(numero);
    this.guardado.set('quieto');
  }

  // Interruptor Abierto/Cerrado del encabezado. La primera vez que se abre un dia no tiene
  // horas (el back crea los 7 dias en null), asi que le ponemos el horario por defecto
  protected cambiarAbierto(abierto: boolean): void {
    const dia = this.dia();
    if (!dia) return;
    this.guardarDia({
      ...dia,
      enabled: abierto,
      dayStart: dia.dayStart ?? DIA_POR_DEFECTO.inicio,
      dayEnd: dia.dayEnd ?? DIA_POR_DEFECTO.fin,
      appointmentDuration: dia.appointmentDuration ?? DIA_POR_DEFECTO.intervalo,
    });
  }

  protected cambiarDesde(desde: string): void {
    const dia = this.dia();
    if (!dia) return;
    // si el nuevo inicio queda despues del fin, corremos el fin una hora para que siga siendo
    // valido. Por ejemplo con fin 12:00, poner inicio 13:00 deja el fin en 14:00
    const fin =
      dia.dayEnd && aMinutos(dia.dayEnd) > aMinutos(desde)
        ? dia.dayEnd
        : this.horas[Math.min(this.horas.indexOf(desde) + 4, this.horas.length - 1)];
    this.guardarDia({ ...dia, dayStart: desde, dayEnd: fin });
  }

  protected cambiarHasta(hasta: string): void {
    const dia = this.dia();
    if (dia) this.guardarDia({ ...dia, dayEnd: hasta });
  }

  protected cambiarIntervalo(intervalo: string): void {
    const dia = this.dia();
    if (dia) this.guardarDia({ ...dia, appointmentDuration: Number(intervalo) });
  }

  // Guarda el dia al toque. Primero cambia la pantalla y despues avisa al back; si el back
  // responde con error, vuelve a como estaba la ultima vez que se guardo bien.
  // Se manda solo ese dia: el PUT acepta una lista parcial y deja los otros como estaban
  private guardarDia(cambiado: DayScheduleResponse): void {
    const negocio = this.negocio();
    if (!negocio) return;
    this.reemplazarDia(cambiado);
    this.guardado.set('guardando');

    const pedido: DayScheduleUpdateRequest = {
      day: cambiado.day,
      enabled: cambiado.enabled,
      // el back acepta las horas sin segundos, y si van en null las ignora
      dayStart: cambiado.dayStart ? horaCorta(cambiado.dayStart) : undefined,
      dayEnd: cambiado.dayEnd ? horaCorta(cambiado.dayEnd) : undefined,
      appointmentDuration: cambiado.appointmentDuration ?? undefined,
    };
    this.horarios
      .guardarDias(negocio.id, [pedido])
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ([confirmado]) => {
          this.confirmados = this.confirmados.map((d) =>
            d.day === confirmado.day ? confirmado : d,
          );
          this.guardado.set('guardado');
        },
        error: (error: ApiError) => {
          const anterior = this.confirmados.find((d) => d.day === cambiado.day);
          if (anterior) this.reemplazarDia(anterior);
          this.errorGuardado.set(error.message);
          this.guardado.set('error');
        },
      });
  }

  private reemplazarDia(dia: DayScheduleResponse): void {
    this.semana.update((semana) => semana.map((d) => (d.day === dia.day ? dia : d)));
  }

  // Boton "+" de una fila: abre el dialogo con la hora de esa fila como inicio
  protected nuevoTurno(hora: string): void {
    this.apertura.set({ dayNumber: this.diaElegido(), turno: null, horaInicial: hora });
  }

  protected editarTurno(turno: AppointmentScheduleResponse): void {
    this.apertura.set({
      dayNumber: turno.dayNumber,
      turno,
      horaInicial: horaCorta(turno.startTime),
    });
  }

  protected cerrarDialogo(): void {
    this.apertura.set(null);
  }

  protected abrirLote(): void {
    this.avisoLote.set(null);
    this.loteAbierto.set(true);
  }

  // Suma a la grilla los turnos que creo el lote y deja el aviso con lo que paso. Es rojo solo
  // si el back rechazo alguno o si no se creo nada; los salteados de la vista previa ya los vio
  protected loteTerminado({ creados, resultado }: FinDeLote): void {
    this.plantilla.update((lista) => [...lista, ...creados]);
    this.avisoLote.set({
      ok: resultado.fallidos === 0 && resultado.creados > 0,
      texto: mensajeDeLote(resultado, !!this.negocio()?.automaticSchedule),
    });
    this.loteAbierto.set(false);
  }

  protected turnoGuardado(turno: AppointmentScheduleResponse): void {
    this.plantilla.update((lista) =>
      lista.some((t) => t.id === turno.id)
        ? lista.map((t) => (t.id === turno.id ? turno : t))
        : [...lista, turno],
    );
    this.cerrarDialogo();
  }

  // El dialogo de edicion tiene un boton Eliminar: cerramos el dialogo y pedimos confirmacion
  protected pedirBaja(turno: AppointmentScheduleResponse): void {
    this.cerrarDialogo();
    this.errorBaja.set('');
    this.baja.set(turno);
  }

  protected cancelarBaja(): void {
    if (!this.procesandoBaja()) this.baja.set(null);
  }

  protected confirmarBaja(): void {
    const turno = this.baja();
    const negocio = this.negocio();
    if (!turno || !negocio || this.procesandoBaja()) return;

    this.procesandoBaja.set(true);
    this.horarios
      .eliminarTurnoProgramado(negocio.id, turno.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.plantilla.update((lista) => lista.filter((t) => t.id !== turno.id));
          this.procesandoBaja.set(false);
          this.baja.set(null);
        },
        error: (error: ApiError) => {
          this.procesandoBaja.set(false);
          this.errorBaja.set(error.message);
        },
      });
  }

  // Link del aviso de arriba: baja hasta la seccion de la agenda automatica, que con muchas
  // filas en la grilla queda lejos
  protected irAAgenda(): void {
    document
      .getElementById('agenda-automatica')
      ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  // Muestra el negocio que vino del back y pasa sus valores a los campos de la agenda
  private mostrarNegocio(negocio: BusinessResponse): void {
    this.negocio.set(negocio);
    this.negocioConfirmado = negocio;
    this.borradorDias.set(String(negocio.scheduleDaysToCreate ?? ''));
    this.borradorAnticipacion.set(String(negocio.scheduleAnticipation ?? ''));
  }

  // Interruptor de la agenda automatica. Al prenderla el back borra los turnos libres futuros y
  // los vuelve a generar desde hoy con la plantilla; al apagarla deja publicados los que ya estan
  protected cambiarAutomatica(prendida: boolean): void {
    const negocio = this.negocio();
    if (!negocio) return;
    this.guardarAgenda({ ...negocio, automaticSchedule: prendida });
  }

  protected escribirDias(valor: string): void {
    this.borradorDias.set(valor);
    this.programarGuardado();
  }

  protected escribirAnticipacion(valor: string): void {
    this.borradorAnticipacion.set(valor);
    this.programarGuardado();
  }

  // Cada tecla reinicia la espera, asi se guarda una sola vez cuando el dueño deja de escribir
  private programarGuardado(): void {
    clearTimeout(this.esperaCampos);
    this.esperaCampos = setTimeout(() => this.guardarCampos(), ESPERA_CAMPOS);
  }

  private guardarCampos(): void {
    const negocio = this.negocio();
    if (!negocio) return;
    const dias = aEntero(this.borradorDias());
    const anticipacion = aEntero(this.borradorAnticipacion());
    const errores = erroresDeAgenda(dias, anticipacion);
    this.erroresAgenda.set(errores);
    if (errores.dias || errores.anticipacion) {
      this.guardadoAgenda.set('quieto');
      return;
    }
    // por ejemplo si borro un numero y lo volvio a escribir igual, no hay nada que guardar
    if (dias === negocio.scheduleDaysToCreate && anticipacion === negocio.scheduleAnticipation) {
      return;
    }
    this.guardarAgenda({
      ...negocio,
      scheduleDaysToCreate: dias,
      scheduleAnticipation: anticipacion,
    });
  }

  // Igual que con los dias: cambia la pantalla primero y despues pone el PUT en la fila.
  // El mensaje de la ultima generacion se borra porque deja de ser cierto: por ejemplo decia
  // hasta el 25/11 y al pasar a 7 dias la agenda queda hasta el 18/11
  private guardarAgenda(cambiado: BusinessResponse): void {
    this.resultadoGenerar.set(null);
    this.negocio.set(cambiado);
    this.guardadoAgenda.set('guardando');
    this.pendientesAgenda++;
    this.colaAgenda.next(cambiado);
  }

  private agendaRespondio(confirmado: BusinessResponse | null, error: ApiError | null): void {
    this.pendientesAgenda--;
    if (confirmado) {
      this.negocioConfirmado = confirmado;
      // si en la fila hay otro guardado esperando, la pantalla ya muestra ese cambio y no la
      // pisamos con este. Cuando vuelve el ultimo se toma lo del back, que trae la fecha hasta
      // donde quedo cargada la agenda
      if (this.pendientesAgenda === 0) {
        this.negocio.set(confirmado);
        this.guardadoAgenda.set('guardado');
      }
      return;
    }
    if (this.negocioConfirmado) this.mostrarNegocio(this.negocioConfirmado);
    this.errorAgenda.set(error?.message ?? 'No se pudo guardar');
    this.guardadoAgenda.set('error');
  }

  // Boton "Generar turnos ahora". El back no dice cuantos turnos creo, asi que contamos los
  // libres publicados antes y despues. Despues volvemos a pedir el negocio para actualizar
  // hasta donde quedo cargada la agenda
  protected generar(): void {
    const negocio = this.negocio();
    if (!negocio?.automaticSchedule || this.generando()) return;

    this.generando.set(true);
    this.resultadoGenerar.set(null);
    this.turnosApi
      .libres(negocio.id)
      .pipe(
        switchMap((antes) =>
          this.horarios.generar(negocio.id).pipe(
            switchMap(() =>
              forkJoin({
                despues: this.turnosApi.libres(negocio.id),
                actualizado: this.negocios.miNegocio(),
              }),
            ),
            map(({ despues, actualizado }) => ({ antes: antes.length, despues, actualizado })),
          ),
        ),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: ({ antes, despues, actualizado }) => {
          this.mostrarNegocio(actualizado);
          this.generando.set(false);
          this.resultadoGenerar.set({
            ok: despues.length > 0,
            texto: mensajeDeGeneracion(antes, despues.length, actualizado.scheduleEnd),
          });
        },
        error: (error: ApiError) => {
          this.generando.set(false);
          this.resultadoGenerar.set({ ok: false, texto: error.message });
        },
      });
  }

  protected tono(employeeId: string | null): TonoProfesional {
    return tonoDeProfesional(
      employeeId,
      this.equipo().map((empleado) => empleado.id),
    );
  }

  protected clasesTarjeta(turno: AppointmentScheduleResponse): string {
    return CLASES_TONO[this.tono(turno.employeeId)].tarjeta;
  }

  protected clasesPunto(turno: AppointmentScheduleResponse): string {
    return CLASES_TONO[this.tono(turno.employeeId)].punto;
  }

  // Si el servicio se dio de baja ya no viene en la lista, por eso el texto de repuesto
  protected nombreServicio(turno: AppointmentScheduleResponse): string {
    return this.nombresServicio().get(turno.serviceId) ?? 'Servicio dado de baja';
  }

  protected nombreProfesional(turno: AppointmentScheduleResponse): string {
    if (!turno.employeeId) return 'Sin asignar';
    return this.nombresEmpleado().get(turno.employeeId) ?? 'Ya no está en el equipo';
  }
}
