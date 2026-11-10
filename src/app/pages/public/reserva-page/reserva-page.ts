import { DOCUMENT, NgTemplateOutlet } from '@angular/common';
import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { interval } from 'rxjs';
import { ApiError } from '../../../core/models/api-error';
import { MINUTOS_PARA_PAGAR, leerReserva } from '../../../core/models/reserva';
import { AppointmentResponse } from '../../../core/models/turno';
import { AppointmentService } from '../../../core/services/appointment-service';
import { AuthService } from '../../../core/services/auth-service';
import { Boton } from '../../../shared/components/boton/boton';
import { Pastilla } from '../../../shared/components/pastilla/pastilla';
import { FechaPipe } from '../../../shared/pipes/fecha-pipe';
import { HoraPipe } from '../../../shared/pipes/hora-pipe';
import { MontoPipe } from '../../../shared/pipes/monto-pipe';

/** Pago de la seña de un turno recién reservado. Se entra desde la página del negocio. */
@Component({
  imports: [NgTemplateOutlet, RouterLink, Boton, Pastilla, FechaPipe, HoraPipe, MontoPipe],
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
  /** null si se entró por link (sin pasar por la reserva): el back no deja traer el turno. */
  protected readonly reserva = leerReserva(inject(DOCUMENT).defaultView?.history.state, this.id);

  protected readonly ahora = signal(Date.now());
  protected readonly pagando = signal(false);
  protected readonly error = signal('');
  /** Turno ya pagado, para la confirmación de quien reservó sin sesión. */
  protected readonly confirmado = signal<AppointmentResponse | null>(null);

  protected readonly turno = this.reserva?.turno ?? null;
  protected readonly sena = this.turno?.deposit?.amount ?? null;
  protected readonly enElLocal =
    this.turno && this.sena !== null ? Number(this.turno.price) - Number(this.sena) : null;
  protected readonly iniciales = iniciales(this.reserva?.negocio.name ?? '');
  protected readonly volverA = this.reserva ? `/${this.reserva.negocio.slug}` : '/';

  /** Milisegundos que quedan para pagar antes de que el back libere el turno. */
  protected readonly restante = computed(() => {
    if (!this.reserva) return null;
    const vence = new Date(this.reserva.reservadaEn).getTime() + MINUTOS_PARA_PAGAR * 60_000;
    return Math.max(0, vence - this.ahora());
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
    if (this.reserva) {
      interval(1000)
        .pipe(takeUntilDestroyed())
        .subscribe(() => this.ahora.set(Date.now()));
    }
  }

  protected pagar(): void {
    if (this.pagando() || this.vencida()) return;
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
          if (this.auth.tieneRol(['CLIENT'])) {
            this.router.navigateByUrl('/mis-turnos');
          } else {
            this.pagando.set(false);
            this.confirmado.set(turno);
          }
        },
        error: (error: ApiError) => {
          this.pagando.set(false);
          this.error.set(error.message);
        },
      });
  }
}

function iniciales(nombre: string): string {
  return nombre
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((palabra) => palabra[0].toUpperCase())
    .join('');
}
