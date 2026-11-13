import { DOCUMENT, NgTemplateOutlet } from '@angular/common';
import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { interval } from 'rxjs';
import { ApiError } from '../../../core/models/api-error';
import { senaDeLaReserva } from '../../../core/models/reserva';
import { AppointmentResponse } from '../../../core/models/turno';
import { AppointmentService } from '../../../core/services/appointment-service';
import { AuthService } from '../../../core/services/auth-service';
import { Boton } from '../../../shared/components/boton/boton';
import { Pastilla } from '../../../shared/components/pastilla/pastilla';
import { FechaPipe } from '../../../shared/pipes/fecha-pipe';
import { HoraPipe } from '../../../shared/pipes/hora-pipe';
import { MontoPipe } from '../../../shared/pipes/monto-pipe';
import { NoEncontradoPage } from '../no-encontrado-page/no-encontrado-page';

type Carga = 'cargando' | 'listo' | 'error' | 'no-encontrado';

/**
 * Qué se muestra según el turno que devuelve el back:
 * - pagar: espera la seña (AWAITING_PAYMENT).
 * - confirmado: ya está BOOKED (pagó, o el servicio no pide seña y se confirmó al reservar).
 * - inactiva: venció, se canceló o la suspendió el negocio, o el horario ya lo tomó otra persona.
 */
type Vista = 'pagar' | 'confirmado' | 'inactiva';

/**
 * Pago de la seña de un turno reservado. Se llega después de reservar en la página del negocio,
 * desde "Pagar seña" en Mis turnos o con el link que el dueño copia en el Panel Hoy.
 * Todo lo que se muestra sale del back (GET /appointments/{id}), no de lo que llega al navegar.
 */
@Component({
  imports: [
    NgTemplateOutlet,
    RouterLink,
    Boton,
    Pastilla,
    FechaPipe,
    HoraPipe,
    MontoPipe,
    NoEncontradoPage,
  ],
  selector: 'app-reserva-page',
  styleUrl: './reserva-page.css',
  templateUrl: './reserva-page.html',
})
export class ReservaPage {
  private readonly turnos = inject(AppointmentService);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly id = inject(ActivatedRoute).snapshot.paramMap.get('id') ?? '';
  /** La seña de la reserva que hizo esta persona, si llegó reservando (ver senaDeLaReserva). */
  private readonly senaPropia = senaDeLaReserva(
    inject(DOCUMENT).defaultView?.history.state,
    this.id,
  );

  protected readonly carga = signal<Carga>('cargando');
  protected readonly turno = signal<AppointmentResponse | null>(null);
  protected readonly ahora = signal(Date.now());
  protected readonly pagando = signal(false);
  protected readonly error = signal('');

  protected readonly vista = computed<Vista | null>(() => {
    const turno = this.turno();
    if (!turno) return null;
    // el horario lo volvió a reservar otra persona después de que venció esta reserva
    const deOtro = this.senaPropia !== null && turno.deposit?.id !== this.senaPropia;
    if (deOtro) return 'inactiva';
    if (turno.status === 'AWAITING_PAYMENT') return 'pagar';
    if (turno.status === 'BOOKED') return 'confirmado';
    return 'inactiva';
  });

  protected readonly sena = computed(() => {
    const monto = this.turno()?.deposit?.amount;
    return monto === undefined || monto === null ? null : Number(monto);
  });
  protected readonly enElLocal = computed(() => {
    const turno = this.turno();
    const sena = this.sena();
    return turno && sena !== null ? Number(turno.price) - sena : null;
  });
  protected readonly negocio = computed(() => this.turno()?.businessName ?? null);
  protected readonly iniciales = computed(() => iniciales(this.negocio() ?? ''));
  protected readonly volverA = computed(() => {
    const slug = this.turno()?.businessSlug;
    return slug ? `/${slug}` : '/';
  });
  protected readonly esCliente = computed(() => this.auth.tieneRol(['CLIENT']));

  /** Por qué la reserva ya no se puede pagar. */
  protected readonly motivoInactiva = computed(() => {
    const turno = this.turno();
    if (!turno || this.vista() !== 'inactiva') return '';
    if (turno.status === 'CANCELLED') return 'Esta reserva se canceló.';
    if (turno.status === 'SUSPENDED') {
      return 'El negocio suspendió este turno. Si pagaste la seña, te la devolvemos.';
    }
    return 'Se venció el tiempo para pagar y el horario se liberó.';
  });

  /**
   * Milisegundos que quedan para pagar. Sale de expiresAt, que es la hora del servidor; se compara
   * con la de la PC porque el back no expone su hora. null si no hay vencimiento.
   */
  protected readonly restante = computed(() => {
    const vence = this.turno()?.expiresAt;
    if (this.vista() !== 'pagar' || !vence) return null;
    const ms = new Date(vence).getTime();
    return Number.isNaN(ms) ? null : Math.max(0, ms - this.ahora());
  });
  protected readonly vencida = computed(() => this.restante() === 0);
  /** mm:ss */
  protected readonly reloj = computed(() => {
    const ms = this.restante();
    if (ms === null) return '';
    const segundos = Math.ceil(ms / 1000);
    return `${String(Math.floor(segundos / 60)).padStart(2, '0')}:${String(segundos % 60).padStart(2, '0')}`;
  });

  constructor() {
    this.cargar();
    interval(1000)
      .pipe(takeUntilDestroyed())
      .subscribe(() => this.ahora.set(Date.now()));
  }

  protected cargar(): void {
    this.carga.set('cargando');
    this.turnos
      .porId(this.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (turno) => {
          this.turno.set(turno);
          this.carga.set('listo');
        },
        error: (error: ApiError) =>
          this.carga.set(error.status === 404 || error.status === 400 ? 'no-encontrado' : 'error'),
      });
  }

  protected pagar(): void {
    if (this.pagando() || this.vencida() || this.vista() !== 'pagar') return;
    this.pagando.set(true);
    this.error.set('');
    this.turnos
      .pagarSena(this.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        // Con la seña paga el turno queda confirmado. Un cliente logueado va a Mis turnos, como
        // pide el ticket. Sin sesión, Mis turnos no le mostraría este turno (el back los busca por
        // usuario), así que se queda acá con la confirmación.
        next: (turno) => {
          if (this.esCliente()) {
            this.router.navigateByUrl('/mis-turnos');
            return;
          }
          this.pagando.set(false);
          this.turno.set(turno);
        },
        // Puede que la reserva haya vencido o cambiado mientras tanto (por ejemplo, se pagó desde
        // otra pestaña): el back responde 400 "el turno no está esperando un pago". Con cualquier
        // 4xx se vuelve a pedir el turno para que la pantalla quede como está en el back.
        error: (error: ApiError) => {
          this.pagando.set(false);
          this.error.set(error.message);
          if (error.status >= 400 && error.status < 500) this.cargar();
        },
      });
  }
}

/** Primera letra de las dos primeras palabras. Solo letras: "Estudio <b>" da "E", no "E<". */
function iniciales(nombre: string): string {
  return nombre
    .split(/\s+/)
    .map((palabra) => palabra.match(/\p{L}/u)?.[0] ?? '')
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();
}
