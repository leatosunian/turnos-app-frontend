import { NgTemplateOutlet } from '@angular/common';
import {
  Component,
  DestroyRef,
  OnInit,
  computed,
  effect,
  inject,
  signal,
  untracked,
} from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { EMPTY, Observable, Subscription, expand, forkJoin, interval, switchMap } from 'rxjs';
import { ApiError } from '../../../core/models/api-error';
import { DayScheduleResponse } from '../../../core/models/horario';
import { Pagina } from '../../../core/models/pagina';
import { ServResponse } from '../../../core/models/servicio';
import { AppointmentResponse } from '../../../core/models/turno';
import { UserResponse } from '../../../core/models/usuario';
import { AppointmentService, ORDEN_TURNOS } from '../../../core/services/appointment-service';
import { EmpleadoService } from '../../../core/services/empleado-service';
import { HorarioService } from '../../../core/services/horario-service';
import { NegocioService } from '../../../core/services/negocio-service';
import { ServicioService } from '../../../core/services/servicio-service';
import { AvisoVacio } from '../../../shared/components/aviso-vacio/aviso-vacio';
import { Boton } from '../../../shared/components/boton/boton';
import { Estado, estadoDeTurno } from '../../../shared/components/estado-turno/estado-turno';
import { FechaPipe } from '../../../shared/pipes/fecha-pipe';
import { DIA_POR_DEFECTO, horaCorta, ordenarSemana } from '../horarios-page/horarios';
import {
  SIN_ASIGNAR,
  alcanzaParaLaSemana,
  armarFilasDelDia,
  claveDia,
  diasConTurnos,
  diasDeLaSemana,
  fechaDeClave,
  filaDisponible,
  filtrarPorProfesional,
  horaDe,
  lunesDeSemana,
  posicionDeAhora,
  rangoDeSemana,
  resumenDelDia,
  sumarDias,
  sumarSinRepetir,
  turnosDelDia,
} from './agenda';
import { DetalleTurnoDialogo } from './detalle-turno-dialogo/detalle-turno-dialogo';
import { AperturaNuevoTurno, NuevoTurnoDialogo } from './nuevo-turno-dialogo/nuevo-turno-dialogo';

type EstadoCarga = 'cargando' | 'listo' | 'sin-negocio' | 'error';

// Cuantos turnos se piden por pagina. El back acepta hasta 2000, pero de a 100 la primera
// respuesta llega rapido y casi siempre alcanza para la semana actual
const POR_PAGINA = 100;

// Como se pinta cada tarjeta segun el estado del turno, con los mismos colores que el chip de
// estado del resto del panel. El punto va en la leyenda de abajo de la grilla
const ESTILOS: Record<Estado, { texto: string; tarjeta: string; punto: string }> = {
  libre: {
    texto: 'Libre',
    tarjeta: 'border-dashed border-line-strong bg-transparent',
    punto: 'border border-dashed border-muted',
  },
  esperando: {
    texto: 'Esperando seña',
    tarjeta: 'border-danger-line bg-danger-soft',
    punto: 'bg-danger',
  },
  confirmado: {
    texto: 'Confirmado',
    tarjeta: 'border-success-line bg-success-soft',
    punto: 'bg-success',
  },
  'en-curso': {
    texto: 'En curso',
    tarjeta: 'border-accent-line bg-accent-soft',
    punto: 'bg-accent',
  },
  terminado: {
    texto: 'Terminado',
    tarjeta: 'border-line bg-surface-2',
    punto: 'border border-muted',
  },
  cancelado: {
    texto: 'Cancelado',
    tarjeta: 'border-line bg-surface-2 opacity-70',
    punto: 'bg-idle',
  },
  suspendido: { texto: 'Suspendido', tarjeta: 'border-info-line bg-info-soft', punto: 'bg-info' },
};

// el orden en que aparecen los estados en la leyenda, del mas comun al menos comun
const LEYENDA: Estado[] = [
  'confirmado',
  'esperando',
  'en-curso',
  'libre',
  'terminado',
  'suspendido',
  'cancelado',
];

// Pantalla de Agenda (/panel/agenda), para el dueño. Muestra los turnos de a un dia, con el mismo
// armado que Horarios y plantillas: arriba las pestañas de la semana con su fecha, y abajo una
// fila por intervalo del horario de atencion de ese dia, con los turnos que arrancan en cada una.
// Se puede ir a la semana anterior o a la siguiente, volver a hoy y filtrar por profesional. La
// semana elegida queda en la URL (?semana=2026-11-09), asi al recargar no se vuelve a la de hoy.
// El back no filtra los turnos por fecha, asi que se traen paginas del mas nuevo al mas viejo
// hasta cubrir la semana y se filtra aca (ver alcanzaParaLaSemana en agenda.ts).
@Component({
  imports: [
    AvisoVacio,
    Boton,
    DetalleTurnoDialogo,
    FechaPipe,
    NgTemplateOutlet,
    NuevoTurnoDialogo,
    RouterLink,
  ],
  selector: 'app-agenda-page',
  styleUrl: './agenda-page.css',
  templateUrl: './agenda-page.html',
})
export class AgendaPage implements OnInit {
  private readonly negocios = inject(NegocioService);
  private readonly horarios = inject(HorarioService);
  private readonly empleadosApi = inject(EmpleadoService);
  private readonly serviciosApi = inject(ServicioService);
  private readonly turnosApi = inject(AppointmentService);
  private readonly router = inject(Router);
  private readonly ruta = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly sinAsignar = SIN_ASIGNAR;
  protected readonly horaCorta = horaCorta;
  protected readonly horaDe = horaDe;
  protected readonly leyenda = LEYENDA.map((estado) => ({ estado, ...ESTILOS[estado] }));

  protected readonly estado = signal<EstadoCarga>('cargando');
  protected readonly errorCarga = signal('');
  protected readonly semanaAtencion = signal<DayScheduleResponse[]>([]);
  protected readonly equipo = signal<UserResponse[]>([]);
  // para el dialogo de nuevo turno
  protected readonly servicios = signal<ServResponse[]>([]);
  protected businessId = '';

  // El dialogo de nuevo turno, con el dia y la fila donde se toco el "+". null es cerrado
  protected readonly apertura = signal<AperturaNuevoTurno | null>(null);
  // El turno con el detalle abierto, o null si no hay ninguno
  protected readonly seleccionado = signal<AppointmentResponse | null>(null);

  // Todo lo que se trajo hasta ahora, en el orden del back (del mas nuevo al mas viejo). Al ir a
  // semanas anteriores se le suman paginas; las semanas que vienen ya estan en las primeras
  protected readonly turnos = signal<AppointmentResponse[]>([]);
  protected readonly cargandoTurnos = signal(false);
  protected readonly errorTurnos = signal('');
  private siguientePagina = 0;
  // si el back todavia tiene paginas mas viejas para mandar
  private readonly quedanPaginas = signal(true);
  private pedidoTurnos?: Subscription;

  // Se actualiza cada 30 segundos para que la linea de la hora y los estados en curso o
  // terminado no queden viejos si la pantalla queda abierta
  protected readonly ahora = signal(new Date());

  // Lo que el dueño eligio en el filtro de profesional: vacio es todo el equipo
  protected readonly filtro = signal('');

  // El ?semana= de la URL. Si no viene o no es una fecha valida se usa la semana de hoy
  private readonly parametros = toSignal(this.ruta.queryParamMap);
  // Se compara por fecha y no por objeto: otro parametro de la URL (como ?nuevo=) o el reloj de
  // cada 30 segundos arman un Date nuevo del mismo lunes, y eso volveria a pedir los turnos
  protected readonly lunes = computed(
    () => {
      const pedida = fechaDeClave(this.parametros()?.get('semana'));
      return lunesDeSemana(pedida ?? this.ahora());
    },
    { equal: (a, b) => a.getTime() === b.getTime() },
  );

  // Arranca en el dia de hoy, con lunes 0 y domingo 6 (getDay da 0 para el domingo, por eso
  // el + 6 y el resto de dividir por 7). Al cambiar de semana se queda en el mismo dia de la
  // semana, asi pasar de un martes al martes siguiente es un solo click
  protected readonly diaElegido = signal((new Date().getDay() + 6) % 7);

  // Las fechas que muestra el dock de arriba, por ejemplo "2 al 8 nov"
  protected readonly rango = computed(() => rangoDeSemana(this.lunes()));
  protected readonly dias = computed(() => diasDeLaSemana(this.lunes(), this.ahora()));
  protected readonly dia = computed(() => this.dias()[this.diaElegido()]);
  // el horario de atencion del dia elegido. semanaAtencion ya viene ordenada de lunes a domingo
  protected readonly atencion = computed(() => this.semanaAtencion()[this.diaElegido()] ?? null);
  protected readonly esSemanaActual = computed(
    () => claveDia(this.lunes()) === claveDia(lunesDeSemana(this.ahora())),
  );

  // Si ya llegaron todas las paginas que hacen falta para la semana elegida. Mientras no, el
  // panel del dia muestra que esta cargando en vez de un dia vacio que despues se llena
  protected readonly semanaLista = computed(() =>
    alcanzaParaLaSemana(this.turnos(), this.lunes(), this.quedanPaginas()),
  );

  // Los turnos de la semana elegida que pasan el filtro de profesional
  private readonly turnosDeLaSemana = computed(() => {
    const desde = claveDia(this.lunes());
    const hasta = claveDia(sumarDias(this.lunes(), 7));
    // las claves tienen el formato aaaa-mm-dd, asi que compararlas como texto ordena por fecha:
    // entran los que arrancan desde el lunes y antes del lunes siguiente
    const enLaSemana = this.turnos().filter((turno) => {
      const clave = turno.startDatetime.slice(0, 10);
      return clave >= desde && clave < hasta;
    });
    return filtrarPorProfesional(enLaSemana, this.filtro());
  });

  // los dias que tienen algun turno, para el puntito de las pestañas
  protected readonly conTurnos = computed(() => diasConTurnos(this.turnosDeLaSemana()));

  private readonly turnosDelDia = computed(() =>
    turnosDelDia(this.turnosDeLaSemana(), this.dia().clave),
  );

  // Los del dia elegido sin el filtro de profesional. Los usa el dialogo de nuevo turno para
  // avisar si choca: con la agenda filtrada en Lucia el dueño igual puede elegir a Tomas en el
  // dialogo, y ahi tienen que contar los turnos de Tomas que no se estan viendo
  protected readonly todosLosDelDia = computed(() => turnosDelDia(this.turnos(), this.dia().clave));

  // El rango de filas del dia elegido: el horario que tiene cargado en Horarios, este abierto o
  // cerrado. Un dia que nunca se abrio tiene las horas en null, y ahi se usa el horario por
  // defecto de Horarios (09:00 a 18:00 cada 30) para que igual se puedan crear turnos a mano.
  // Asi la agenda sirve tambien para el que no usa la agenda automatica y carga todo a mano
  private readonly horario = computed(() => this.horarioDe(this.diaElegido()));

  // El horario de cualquier dia de la semana (0 es lunes), con el mismo criterio que horario
  private horarioDe(dia: number): { inicio: string; fin: string; intervalo: number } {
    const atencion = this.semanaAtencion()[dia] ?? null;
    return {
      inicio: atencion?.dayStart ?? DIA_POR_DEFECTO.inicio,
      fin: atencion?.dayEnd ?? DIA_POR_DEFECTO.fin,
      intervalo: atencion?.appointmentDuration ?? DIA_POR_DEFECTO.intervalo,
    };
  }

  // Las filas del dia elegido con sus turnos, en todos los dias, tambien en los cerrados
  protected readonly grilla = computed(() => {
    const { inicio, fin, intervalo } = this.horario();
    return armarFilasDelDia(this.turnosDelDia(), inicio, fin, intervalo);
  });

  // Los turnos que no entran en ninguna fila porque quedaron fuera del horario del dia (pasa si
  // el dueño achico el horario despues de que se crearon). Se listan abajo para que no se pierdan
  protected readonly turnosSinFila = computed(() => this.grilla().fueraDeHorario);

  protected readonly hayTurnos = computed(() => this.turnosDelDia().length > 0);

  // Donde va la linea de la hora actual, o null si el dia elegido no es hoy
  protected readonly lineaAhora = computed(() => {
    const { inicio, fin, intervalo } = this.horario();
    return posicionDeAhora(this.dia().clave, inicio, fin, intervalo, this.ahora());
  });

  // El subtitulo del dia, por ejemplo "3 reservados · 2 libres" o "Sin turnos"
  protected readonly resumen = computed(() => {
    const { reservados, libres } = resumenDelDia(this.turnosDelDia());
    if (!reservados && !libres) return 'Sin turnos';
    const partes: string[] = [];
    if (reservados) partes.push(`${reservados} ${reservados === 1 ? 'reservado' : 'reservados'}`);
    if (libres) partes.push(`${libres} ${libres === 1 ? 'libre' : 'libres'}`);
    return partes.join(' · ');
  });

  // El horario de las filas para el encabezado, por ejemplo "09:00 a 18:00 · cada 30 min"
  protected readonly horarioDelDia = computed(() => {
    const { inicio, fin, intervalo } = this.horario();
    return `${horaCorta(inicio)} a ${horaCorta(fin)} · cada ${intervalo} min`;
  });

  private readonly nombresEmpleado = computed(
    () => new Map(this.equipo().map((empleado) => [empleado.id, empleado.name])),
  );

  constructor() {
    interval(30_000)
      .pipe(takeUntilDestroyed())
      .subscribe(() => this.ahora.set(new Date()));

    // Cada vez que cambia la semana (o termina la carga inicial) se piden las paginas que falten.
    // Lo de adentro va sin seguimiento para que el effect dependa solo de la semana y del estado,
    // y no de los turnos que el mismo pedido va sumando
    effect(() => {
      const lunes = this.lunes();
      if (this.estado() !== 'listo') return;
      untracked(() => this.traerHasta(lunes));
    });

    // "+ Nuevo turno" del menu: cuando termina la carga, abre el dialogo (ver abrirNuevoDelMenu)
    effect(() => {
      if (this.estado() !== 'listo' || this.parametros()?.get('nuevo') !== '1') return;
      untracked(() => this.abrirNuevoDelMenu());
    });
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
          this.businessId = negocio.id;
          return forkJoin({
            semana: this.horarios.semana(negocio.id),
            equipo: this.empleadosApi.listar(negocio.id),
            servicios: this.serviciosApi.listar(negocio.id),
          });
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: ({ semana, equipo, servicios }) => {
          this.servicios.set(servicios);
          this.semanaAtencion.set(ordenarSemana(semana));
          this.equipo.set(equipo);
          this.reiniciarTurnos();
          this.estado.set('listo');
        },
        error: (error: ApiError) => {
          this.errorCarga.set(error.message);
          this.estado.set(error.status === 404 ? 'sin-negocio' : 'error');
        },
      });
  }

  // Flechas de semana anterior y siguiente: mueve la semana de a 7 dias. Va por la URL, asi el
  // boton de atras del navegador tambien vuelve a la semana anterior que se estaba mirando
  protected moverSemana(semanas: number): void {
    this.irASemana(sumarDias(this.lunes(), semanas * 7));
  }

  // Boton Hoy: vuelve a la semana actual y elige el dia de hoy
  protected irAHoy(): void {
    this.diaElegido.set((this.ahora().getDay() + 6) % 7);
    // scroll manual para que cambiar de semana no suba la pagina, se queda donde estaba
    this.router.navigate([], {
      relativeTo: this.ruta,
      queryParams: { semana: null },
      scroll: 'manual',
    });
  }

  protected elegirDia(numero: number): void {
    this.diaElegido.set(numero);
  }

  protected elegirProfesional(valor: string): void {
    this.filtro.set(valor);
  }

  protected reintentarTurnos(): void {
    this.traerHasta(this.lunes());
  }

  // La clase de color de una tarjeta y el texto de su estado
  protected estilo(turno: AppointmentResponse): { texto: string; tarjeta: string } {
    return ESTILOS[estadoDeTurno(turno, this.ahora())];
  }

  // Lo que va en la segunda linea de la tarjeta, por ejemplo "Corte · Lucia" o
  // "Corte · Sin asignar". Si el profesional ya no esta en el equipo se usa el nombre que manda
  // el turno
  protected detalle(turno: AppointmentResponse): string {
    const profesional = turno.employeeId
      ? (this.nombresEmpleado().get(turno.employeeId) ?? turno.employeeName ?? 'Profesional')
      : 'Sin asignar';
    return `${turno.serviceName} · ${profesional}`;
  }

  // Si en una fila se muestra el "+" para crear un turno: alcanza con que la franja no haya
  // terminado, aunque el dia este cerrado o la agenda automatica apagada, porque el dueño puede
  // cargar sus turnos a mano. Por ejemplo hoy a las 10:12 la fila de las 10:00 de a 30 todavia
  // deja crear uno a las 10:15, pero la de las 09:30 ya no, y en un dia que ya paso no hay "+"
  protected puedeAgregar(hora: string): boolean {
    return filaDisponible(this.dia().clave, hora, this.horario().intervalo, this.ahora());
  }

  // Abre el dialogo de nuevo turno en el dia elegido y la fila tocada. Si el filtro esta en un
  // profesional, el turno arranca asignado a esa persona
  protected nuevoTurno(hora: string): void {
    const filtro = this.filtro();
    this.apertura.set({
      clave: this.dia().clave,
      fecha: this.dia().fecha,
      hora,
      intervalo: this.horario().intervalo,
      cierre: this.horario().fin,
      empleadoId: filtro && filtro !== SIN_ASIGNAR ? filtro : null,
    });
  }

  // Lo que hace "+ Nuevo turno" del menu (llega a /panel/agenda?nuevo=1): abre el dialogo en la
  // primera fila que todavia se puede usar, arrancando por hoy y siguiendo con los dias que
  // quedan de la semana. Despues saca el ?nuevo= de la URL, asi recargar o volver atras no lo
  // abre de nuevo. Si en la semana ya no queda lugar (domingo a la noche), deja la agenda abierta
  private abrirNuevoDelMenu(): void {
    this.router.navigate([], {
      relativeTo: this.ruta,
      queryParams: { nuevo: null },
      queryParamsHandling: 'merge',
      replaceUrl: true,
      // solo limpia la URL, no tiene que mover la pantalla mientras se abre el dialogo
      scroll: 'manual',
    });
    if (!this.esSemanaActual()) return;
    const hoy = (this.ahora().getDay() + 6) % 7;
    for (let i = hoy; i < 7; i++) {
      const { inicio, fin, intervalo } = this.horarioDe(i);
      const clave = this.dias()[i].clave;
      const fila = armarFilasDelDia([], inicio, fin, intervalo).filas.find((f) =>
        filaDisponible(clave, f.hora, intervalo, this.ahora()),
      );
      if (fila) {
        this.diaElegido.set(i);
        this.nuevoTurno(fila.hora);
        return;
      }
    }
  }

  // El dialogo creo el turno: se suma a lo que ya estaba cargado, asi aparece en su fila sin
  // volver a pedir todas las paginas. Va adelante de la lista porque es de los mas nuevos y
  // la lista esta del mas nuevo al mas viejo (alcanzaParaLaSemana mira el ultimo)
  protected turnoCreado(turno: AppointmentResponse): void {
    this.turnos.update((actuales) => sumarSinRepetir([turno], actuales));
    this.apertura.set(null);
  }

  // Abre el detalle de un turno al tocar su tarjeta
  protected verTurno(turno: AppointmentResponse): void {
    this.seleccionado.set(turno);
  }

  // El detalle borro un turno libre: se saca de la lista para que desaparezca de su fila sin
  // volver a pedir las paginas
  protected turnoEliminado(id: string): void {
    this.turnos.update((actuales) => actuales.filter((turno) => turno.id !== id));
    this.seleccionado.set(null);
  }

  private irASemana(lunes: Date): void {
    // la semana actual no va en la URL, asi el link de la agenda queda limpio
    const esActual = claveDia(lunes) === claveDia(lunesDeSemana(this.ahora()));
    this.router.navigate([], {
      relativeTo: this.ruta,
      queryParams: { semana: esActual ? null : claveDia(lunes) },
      // sigue siendo la misma pantalla, asi que no se sube arriba al pasar de semana
      scroll: 'manual',
    });
  }

  // Vacia lo que se trajo y arranca otra vez desde la primera pagina
  private reiniciarTurnos(): void {
    this.pedidoTurnos?.unsubscribe();
    this.turnos.set([]);
    this.siguientePagina = 0;
    this.quedanPaginas.set(true);
  }

  // Pide paginas, una atras de la otra, hasta tener toda la semana que arranca en lunes.
  // Si ya estan (por ejemplo al volver a una semana que ya se vio) no pide nada
  private traerHasta(lunes: Date): void {
    if (alcanzaParaLaSemana(this.turnos(), lunes, this.quedanPaginas())) return;

    this.pedidoTurnos?.unsubscribe();
    this.cargandoTurnos.set(true);
    this.errorTurnos.set('');
    this.pedidoTurnos = this.pagina(this.siguientePagina)
      .pipe(
        // expand vuelve a llamar a esta funcion con cada pagina que llega: la suma a la lista y,
        // si todavia no alcanza, devuelve el pedido de la siguiente; EMPTY corta la cadena
        expand((pagina) => {
          this.sumarPagina(pagina);
          return alcanzaParaLaSemana(this.turnos(), lunes, this.quedanPaginas())
            ? EMPTY
            : this.pagina(this.siguientePagina);
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        complete: () => this.cargandoTurnos.set(false),
        error: (error: ApiError) => {
          this.errorTurnos.set(error.message);
          this.cargandoTurnos.set(false);
        },
      });
  }

  private pagina(numero: number): Observable<Pagina<AppointmentResponse>> {
    return this.turnosApi.listar(this.businessId, {
      page: numero,
      size: POR_PAGINA,
      sort: ORDEN_TURNOS,
    });
  }

  private sumarPagina(pagina: Pagina<AppointmentResponse>): void {
    this.turnos.update((actuales) => sumarSinRepetir(actuales, pagina.items));
    this.siguientePagina = pagina.numero + 1;
    // numero arranca en 0, asi que la ultima pagina es totalPaginas - 1
    this.quedanPaginas.set(pagina.numero + 1 < pagina.totalPaginas);
  }
}
