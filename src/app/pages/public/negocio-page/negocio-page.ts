import { formatDate } from '@angular/common';
import {
  Component,
  DestroyRef,
  ElementRef,
  LOCALE_ID,
  computed,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  AbstractControl,
  NonNullableFormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription, interval, map, switchMap } from 'rxjs';
import { ApiError } from '../../../core/models/api-error';
import { HORAS_PARA_DEVOLVER_SENA } from '../../../core/models/turno-cliente';
import { ReservaEnCurso } from '../../../core/models/reserva';
import { BusinessResponse } from '../../../core/models/negocio';
import { ServResponse } from '../../../core/models/servicio';
import { AppointmentResponse } from '../../../core/models/turno';
import { AppointmentService } from '../../../core/services/appointment-service';
import { AuthService } from '../../../core/services/auth-service';
import { NegocioService } from '../../../core/services/negocio-service';
import { ServicioService } from '../../../core/services/servicio-service';
import { Boton } from '../../../shared/components/boton/boton';
import { Campo } from '../../../shared/components/campo/campo';
import { Slot } from '../../../shared/components/slot/slot';
import { DuracionPipe } from '../../../shared/pipes/duracion-pipe';
import { FechaPipe } from '../../../shared/pipes/fecha-pipe';
import { HoraPipe } from '../../../shared/pipes/hora-pipe';
import { MontoPipe } from '../../../shared/pipes/monto-pipe';
import { NoEncontradoPage } from '../no-encontrado-page/no-encontrado-page';
import { emailValido, obligatorio } from '../../../shared/validadores/validadores';
import {
  agruparPorDia,
  claveDeFecha,
  horasEnTexto,
  iniciales,
  mesDeClave,
  montoSena,
  nombreRubro,
  porcentajeSena,
  reservables,
  semanasDelMes,
  separarPorTurno,
} from './reserva';

type Estado = 'cargando' | 'listo' | 'no-encontrado' | 'error';
type EstadoLibres = 'cargando' | 'listo' | 'error';

/** Por qué se perdió el horario elegido al intentar reservarlo. */
interface HorarioPerdido {
  titulo: string;
  detalle: string;
}

/** Cada cuánto se vuelve a mirar la hora para sacar los horarios que ya no se pueden reservar. */
const CADA_CUANTO_MIRAR_LA_HORA = 30_000;

// mismas reglas que BookAppointmentRequest del back
const TELEFONO = /^[0-9+\-\s]{7,20}$/;

const DIAS_SEMANA = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

@Component({
  imports: [
    Boton,
    Campo,
    DuracionPipe,
    FechaPipe,
    HoraPipe,
    MontoPipe,
    NoEncontradoPage,
    ReactiveFormsModule,
    Slot,
  ],
  selector: 'app-negocio-page',
  styleUrl: './negocio-page.css',
  templateUrl: './negocio-page.html',
})
export class NegocioPage {
  private readonly negocios = inject(NegocioService);
  private readonly serviciosApi = inject(ServicioService);
  private readonly turnosApi = inject(AppointmentService);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly destroyRef = inject(DestroyRef);
  private readonly locale = inject(LOCALE_ID);
  private slug = '';
  private pedidoNegocio?: Subscription;
  private pedidoLibres?: Subscription;

  protected readonly diasSemana = DIAS_SEMANA;
  protected readonly mensajes = {
    nombre: {
      required: 'Ingresá tu nombre y apellido.',
      maxlength: 'Puede tener hasta 100 caracteres.',
    },
    email: {
      required: 'Ingresá tu email para recibir el turno.',
      email: 'Revisá el email, no parece válido.',
      maxlength: 'Puede tener hasta 255 caracteres.',
    },
    telefono: { pattern: 'Revisá el teléfono: entre 7 y 20 números, sin letras.' },
  };

  protected readonly estado = signal<Estado>('cargando');
  protected readonly errorCarga = signal('');
  protected readonly negocio = signal<BusinessResponse | null>(null);
  protected readonly servicios = signal<ServResponse[]>([]);

  protected readonly servicioId = signal<string | null>(null);
  /** Los libres tal cual los mandó el back. Lo que se muestra es `libres`, que los filtra. */
  private readonly libresDelBack = signal<AppointmentResponse[]>([]);
  protected readonly estadoLibres = signal<EstadoLibres>('cargando');
  protected readonly mes = signal(primerDiaDelMes(new Date()));
  protected readonly dia = signal<string | null>(null);
  protected readonly turnoId = signal<string | null>(null);

  protected readonly enviado = signal(false);
  protected readonly reservando = signal(false);
  protected readonly errorReserva = signal<string | null>(null);
  /**
   * El back rechazó el horario elegido mientras el cliente completaba los datos: lo tomó otra
   * persona o quedó dentro de la anticipación mínima del negocio.
   */
  protected readonly horarioPerdido = signal<HorarioPerdido | null>(null);
  /** La hora contra la que se filtran los horarios. Avanza sola cada CADA_CUANTO_MIRAR_LA_HORA. */
  private readonly ahora = signal(Date.now());

  protected readonly logueado = this.auth.logueado;

  protected readonly datos = inject(NonNullableFormBuilder).group({
    nombre: ['', [obligatorio, Validators.maxLength(100)]],
    email: ['', [obligatorio, emailValido, Validators.maxLength(255)]],
    telefono: ['', Validators.pattern(TELEFONO)],
  });

  protected readonly iniciales = computed(() => iniciales(this.negocio()?.name ?? ''));
  protected readonly rubros = computed(() =>
    (this.negocio()?.businessTypes ?? []).map(nombreRubro).join(' · '),
  );
  /** Horas de anticipación mínima para reservar. Sin valor (negocios de antes) es 0. */
  protected readonly horasAnticipacion = computed(() => this.negocio()?.minBookingNoticeHours ?? 0);
  protected readonly textoAnticipacion = computed(() => horasEnTexto(this.horasAnticipacion()));
  /**
   * Los libres que todavía se pueden reservar ahora. El back ya filtra al responder, pero mientras
   * el cliente mira la página el tiempo pasa y algunos quedan dentro de la anticipación.
   */
  protected readonly libres = computed(() =>
    reservables(this.libresDelBack(), this.ahora(), this.horasAnticipacion()),
  );

  protected readonly servicio = computed(
    () => this.servicios().find((s) => s.id === this.servicioId()) ?? null,
  );
  /** Cada servicio cobra su propio porcentaje, así que la pastilla sigue al servicio elegido. */
  protected readonly senaServicio = computed(() => {
    const servicio = this.servicio();
    if (!servicio) return null;
    return { porcentaje: porcentajeSena(servicio), monto: montoSena(servicio.price, servicio) };
  });
  /** Servicio sin seña: el turno queda confirmado al reservar, no hay nada que pagar. */
  protected readonly sinSena = computed(() => this.senaServicio()?.porcentaje === 0);
  /**
   * Con cuántas horas de anticipación cancelar devuelve la seña, según la política del negocio.
   * Si no viene (negocios de antes de la política), es la regla de siempre: 24 h.
   */
  protected readonly horasPolitica = computed(
    () => this.negocio()?.cancellationNoticeHours ?? HORAS_PARA_DEVOLVER_SENA,
  );
  private readonly libresPorDia = computed(() => agruparPorDia(this.libres()));
  protected readonly semanas = computed(() =>
    semanasDelMes(this.mes(), new Set(this.libresPorDia().keys())),
  );
  protected readonly puedeRetroceder = computed(() => this.mes() > primerDiaDelMes(new Date()));
  protected readonly puedeAvanzar = computed(() => {
    const ultimo = [...this.libresPorDia().keys()].at(-1);
    return !!ultimo && this.mes() < mesDeClave(ultimo);
  });
  protected readonly horariosDelDia = computed(
    () => this.libresPorDia().get(this.dia() ?? '') ?? [],
  );
  protected readonly gruposHorario = computed(() => {
    const { manana, tarde } = separarPorTurno(this.horariosDelDia());
    return [
      { nombre: 'Mañana', turnos: manana },
      { nombre: 'Tarde', turnos: tarde },
    ].filter((grupo) => grupo.turnos.length);
  });
  /** Si dos profesionales tienen libre la misma hora, el horario muestra con quién es. */
  protected readonly horasRepetidas = computed(() => {
    const vistas = new Set<string>();
    const repetidas = new Set<string>();
    for (const { startDatetime } of this.horariosDelDia()) {
      (vistas.has(startDatetime) ? repetidas : vistas).add(startDatetime);
    }
    return repetidas;
  });
  protected readonly nombreMes = computed(() => {
    const texto = formatDate(this.mes(), 'MMMM y', this.locale);
    return texto.charAt(0).toUpperCase() + texto.slice(1);
  });
  protected readonly turno = computed(
    () => this.libres().find((t) => t.id === this.turnoId()) ?? null,
  );
  /**
   * El horario elegido sigue libre pero ya no se puede reservar: mientras el cliente miraba, quedó
   * dentro de la anticipación mínima (o empezó, si el negocio no pide anticipación).
   */
  protected readonly turnoVencido = computed(() => {
    const id = this.turnoId();
    return !!id && !this.turno() && this.libresDelBack().some((t) => t.id === id);
  });
  protected readonly sena = computed(() => {
    const turno = this.turno();
    const servicio = this.servicio();
    return turno && servicio ? montoSena(turno.price, servicio) : null;
  });

  constructor() {
    inject(ActivatedRoute)
      .paramMap.pipe(takeUntilDestroyed())
      .subscribe((params) => {
        this.slug = params.get('slug') ?? '';
        this.cargar();
      });

    interval(CADA_CUANTO_MIRAR_LA_HORA)
      .pipe(takeUntilDestroyed())
      .subscribe(() => this.actualizarHora());

    // con sesión, el back usa el nombre y el email de la cuenta
    const usuario = this.auth.usuario();
    if (usuario) {
      this.datos.patchValue({ nombre: usuario.name, email: usuario.email });
      this.datos.controls.nombre.disable();
      this.datos.controls.email.disable();
    }
  }

  protected cargar(): void {
    this.pedidoNegocio?.unsubscribe();
    this.estado.set('cargando');
    this.servicioId.set(null);
    this.pedidoNegocio = this.negocios
      .porSlug(this.slug)
      .pipe(
        switchMap((negocio) =>
          this.serviciosApi.listar(negocio.id).pipe(map((servicios) => ({ negocio, servicios }))),
        ),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: ({ negocio, servicios }) => {
          this.negocio.set(negocio);
          this.servicios.set(servicios);
          this.estado.set('listo');
          if (servicios.length) this.elegirServicio(servicios[0].id);
        },
        error: (error: ApiError) => {
          this.errorCarga.set(error.message);
          this.estado.set(error.status === 404 ? 'no-encontrado' : 'error');
        },
      });
  }

  protected elegirServicio(id: string): void {
    if (id === this.servicioId() && this.estadoLibres() !== 'error') return;
    this.servicioId.set(id);
    this.turnoId.set(null);
    this.horarioPerdido.set(null);
    this.errorReserva.set(null);
    this.cargarLibres();
  }

  protected cargarLibres(alTerminar?: () => void): void {
    const negocio = this.negocio();
    const servicioId = this.servicioId();
    if (!negocio || !servicioId) return;

    this.pedidoLibres?.unsubscribe();
    this.estadoLibres.set('cargando');
    this.pedidoLibres = this.turnosApi
      .libres(negocio.id, servicioId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (libres) => {
          this.ahora.set(Date.now());
          this.libresDelBack.set(libres);
          this.estadoLibres.set('listo');
          this.ajustarDia();
          alTerminar?.();
        },
        error: () => this.estadoLibres.set('error'),
      });
  }

  protected cambiarMes(meses: number): void {
    const mes = this.mes();
    this.mes.set(new Date(mes.getFullYear(), mes.getMonth() + meses, 1));
  }

  protected elegirDia(clave: string): void {
    this.dia.set(clave);
    this.turnoId.set(null);
  }

  protected elegirTurno(id: string): void {
    this.turnoId.set(id);
    this.horarioPerdido.set(null);
    this.errorReserva.set(null);
  }

  /**
   * Vuelve a mirar la hora: los horarios que quedaron dentro de la anticipación dejan de mostrarse.
   * Si el día elegido se queda sin horarios, pasa al siguiente que tenga.
   */
  protected actualizarHora(): void {
    this.ahora.set(Date.now());
    const dia = this.dia();
    if (dia && !this.libresPorDia().has(dia)) this.ajustarDia();
  }

  protected error(control: AbstractControl, mensajes: Record<string, string>): string | null {
    if (!control.errors || !(control.touched || this.enviado())) return null;
    const clave = Object.keys(mensajes).find((k) => control.hasError(k));
    return clave ? mensajes[clave] : null;
  }

  protected reservar(): void {
    const turno = this.turno();
    if (!turno || this.reservando()) return;

    this.enviado.set(true);
    this.errorReserva.set(null);
    if (this.datos.invalid) {
      this.host.nativeElement.querySelector<HTMLElement>('input.ng-invalid')?.focus();
      return;
    }

    const { nombre, email, telefono } = this.datos.getRawValue();
    const datos = {
      ...(this.logueado() ? {} : { clientName: nombre.trim(), clientEmail: email.trim() }),
      // vacío no pasa la validación del back
      clientPhone: telefono.trim() || undefined,
    };

    this.reservando.set(true);
    this.turnosApi
      .reservar(turno.id, datos)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        // la página de pago no tiene de dónde pedir el turno ni el negocio, así que se los pasamos
        next: (reservado) => {
          const negocio = this.negocio()!;
          const reserva: ReservaEnCurso = {
            turno: reservado,
            negocio: { name: negocio.name, slug: negocio.slug },
            reservadaEn: new Date().toISOString(),
          };
          this.router.navigate(['/reserva', reservado.id], { state: reserva });
        },
        error: (error: ApiError) => {
          this.reservando.set(false);
          if (error.status === 409 || error.status === 404) {
            // puede ser que lo tomó otro, que quedó dentro de la anticipación mínima del negocio o
            // que el cliente ya tiene uno pendiente de pago
            this.cargarLibres(() => {
              if (this.turno()) {
                this.errorReserva.set(error.message);
                return;
              }
              this.turnoId.set(null);
              // si con la hora de ahora ya no cumple la anticipación, no es que lo tomó otro: el
              // mensaje del back dice cuántas horas pide el negocio
              const porAnticipacion = !reservables([turno], Date.now(), this.horasAnticipacion())
                .length;
              this.horarioPerdido.set(
                porAnticipacion
                  ? { titulo: 'Ese horario ya no se puede reservar', detalle: error.message }
                  : {
                      titulo: 'Ese horario se acaba de ocupar',
                      detalle: 'Elegí otro de los que siguen libres.',
                    },
              );
            });
            return;
          }
          this.errorReserva.set(error.message.replace(/(^|, )client(Name|Email|Phone): /g, '$1'));
        },
      });
  }

  /** Deja elegido un día con horarios libres y muestra su mes. */
  private ajustarDia(): void {
    // las claves (aaaa-mm-dd) vienen en orden, asi que se comparan como texto
    const dias = [...this.libresPorDia().keys()];
    const dia = this.dia();
    // Si el dia elegido se quedo sin horarios (por ejemplo, alguien tomo el ultimo mientras el
    // cliente lo tenia elegido), pasa al siguiente con horarios y, si no hay, al anterior mas
    // cercano. Asi no salta al primer dia del calendario, que puede estar semanas antes
    const elegido = !dia
      ? (dias[0] ?? null)
      : dias.includes(dia)
        ? dia
        : (dias.find((d) => d > dia) ?? dias.at(-1) ?? null);
    this.dia.set(elegido);
    this.mes.set(elegido ? mesDeClave(elegido) : primerDiaDelMes(new Date()));
  }
}

function primerDiaDelMes(fecha: Date): Date {
  return mesDeClave(claveDeFecha(fecha));
}
