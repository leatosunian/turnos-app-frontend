import { NgTemplateOutlet } from '@angular/common';
import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { forkJoin, switchMap } from 'rxjs';
import { ApiError } from '../../../core/models/api-error';
import {
  AppointmentScheduleResponse,
  DayScheduleResponse,
  DayScheduleUpdateRequest,
} from '../../../core/models/horario';
import { BusinessResponse } from '../../../core/models/negocio';
import { ServResponse } from '../../../core/models/servicio';
import { UserResponse } from '../../../core/models/usuario';
import { EmpleadoService } from '../../../core/services/empleado-service';
import { HorarioService } from '../../../core/services/horario-service';
import { NegocioService } from '../../../core/services/negocio-service';
import { ServicioService } from '../../../core/services/servicio-service';
import { MenuMasEstado } from '../../../layouts/private-layout/menu-mas/menu-mas-estado';
import { AvisoVacio } from '../../../shared/components/aviso-vacio/aviso-vacio';
import { Boton } from '../../../shared/components/boton/boton';
import { Confirmacion } from '../../../shared/components/confirmacion/confirmacion';
import { Interruptor } from '../../../shared/components/interruptor/interruptor';
import { MontoPipe } from '../../../shared/pipes/monto-pipe';
import {
  DIAS,
  DIA_POR_DEFECTO,
  INTERVALOS,
  TonoProfesional,
  aMinutos,
  armarGrilla,
  conHora,
  horaCorta,
  opcionesDeHora,
  ordenarSemana,
  tonoDeProfesional,
} from './horarios';
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

// Pantalla de Horarios y plantillas (/panel/horarios), solo para el dueño. Arriba van las
// pestañas de los dias; en cada dia se configura el horario de atencion (abierto o cerrado,
// desde, hasta y cada cuanto se parte la grilla) y abajo la grilla con los turnos programados
// de la plantilla semanal. Los cambios del dia se guardan solos, sin boton de guardar.
@Component({
  imports: [
    AvisoVacio,
    Boton,
    Confirmacion,
    Interruptor,
    MontoPipe,
    NgTemplateOutlet,
    RouterLink,
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
  private readonly menuMas = inject(MenuMasEstado);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly dias = DIAS;
  protected readonly intervalos = INTERVALOS;
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
  protected readonly baja = signal<AppointmentScheduleResponse | null>(null);
  protected readonly procesandoBaja = signal(false);
  protected readonly errorBaja = signal('');

  // Copia de como quedo cada dia la ultima vez que el back lo confirmo. Si un guardado falla,
  // el dia vuelve a estos valores asi la pantalla no muestra algo que no se guardo
  private confirmados: DayScheduleResponse[] = [];

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
          this.negocio.set(negocio);
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
