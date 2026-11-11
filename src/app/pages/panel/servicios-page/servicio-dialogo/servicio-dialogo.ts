import { Component, OnInit, computed, inject, input, output, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { AbstractControl, FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { map } from 'rxjs';
import { ApiError } from '../../../../core/models/api-error';
import { ServRequest, ServResponse } from '../../../../core/models/servicio';
import { ServicioService } from '../../../../core/services/servicio-service';
import { Boton } from '../../../../shared/components/boton/boton';
import { Campo } from '../../../../shared/components/campo/campo';
import { MontoPipe } from '../../../../shared/pipes/monto-pipe';
import { Dialogo } from '../dialogo/dialogo';
import { PORCENTAJE_SENA_POR_DEFECTO, montoSena } from '../sena';

const NUMERO_ENTERO = /^\d+$/;

/** Alta y edición de un servicio. Guarda contra el back y avisa con `guardado`. */
@Component({
  selector: 'app-servicio-dialogo',
  imports: [Boton, Campo, Dialogo, MontoPipe, ReactiveFormsModule],
  templateUrl: './servicio-dialogo.html',
})
export class ServicioDialogo implements OnInit {
  readonly businessId = input.required<string>();
  /** null para crear uno nuevo. */
  readonly servicio = input<ServResponse | null>(null);
  readonly guardado = output<ServResponse>();
  readonly cancelado = output<void>();

  private readonly servicios = inject(ServicioService);

  protected readonly form = inject(FormBuilder).group({
    nombre: ['', [Validators.required, Validators.maxLength(80)]],
    duracion: [
      null as number | null,
      [
        Validators.required,
        Validators.min(1),
        Validators.max(480),
        Validators.pattern(NUMERO_ENTERO),
      ],
    ],
    precio: [
      null as number | null,
      [Validators.required, Validators.min(0.01), Validators.max(10_000_000)],
    ],
    sena: [
      PORCENTAJE_SENA_POR_DEFECTO as number | null,
      [Validators.required, Validators.min(0), Validators.max(100)],
    ],
  });

  protected readonly mensajes = {
    nombre: {
      required: 'Ingresá el nombre del servicio.',
      maxlength: 'Puede tener hasta 80 caracteres.',
    },
    duracion: {
      required: 'Ingresá cuántos minutos dura.',
      pattern: 'Usá minutos enteros.',
      min: 'Tiene que durar al menos 1 minuto.',
      max: 'Puede durar hasta 480 minutos (8 horas).',
    },
    precio: {
      required: 'Ingresá el precio.',
      min: 'El precio tiene que ser mayor a 0.',
      max: 'El precio es demasiado alto.',
    },
    sena: {
      required: 'Ingresá el porcentaje de seña.',
      min: 'Tiene que estar entre 0 y 100.',
      max: 'Tiene que estar entre 0 y 100.',
    },
  };

  protected readonly enviado = signal(false);
  protected readonly guardando = signal(false);
  protected readonly errorServidor = signal<string | null>(null);

  private readonly valores = toSignal(
    this.form.valueChanges.pipe(map(() => this.form.getRawValue())),
    { initialValue: this.form.getRawValue() },
  );

  protected readonly sena = computed(() => {
    const { precio, sena } = this.valores();
    return precio && sena !== null && sena >= 0 ? montoSena(precio, sena) : null;
  });

  ngOnInit(): void {
    const servicio = this.servicio();
    if (servicio) {
      this.form.setValue({
        nombre: servicio.name,
        duracion: servicio.durationMinutes,
        precio: servicio.price,
        sena: servicio.depositPorcentage ?? PORCENTAJE_SENA_POR_DEFECTO,
      });
    }
  }

  protected guardar(): void {
    this.enviado.set(true);
    this.errorServidor.set(null);
    if (this.form.invalid || this.guardando()) return;

    const { nombre, duracion, precio, sena } = this.form.getRawValue();
    const datos: ServRequest = {
      name: (nombre ?? '').trim(),
      durationMinutes: Number(duracion),
      price: Number(precio),
      depositPorcentage: Number(sena),
    };
    const servicio = this.servicio();
    const pedido = servicio
      ? this.servicios.actualizar(this.businessId(), servicio.id, datos)
      : this.servicios.crear(this.businessId(), datos);

    this.guardando.set(true);
    pedido.subscribe({
      next: (guardado) => this.guardado.emit(guardado),
      error: (error: ApiError) => {
        this.guardando.set(false);
        this.errorServidor.set(error.message.replace(/(^|, )\w+: /g, '$1'));
      },
    });
  }

  protected error(control: AbstractControl, mensajes: Record<string, string>): string | null {
    if (!control.errors || !(control.touched || this.enviado())) return null;
    const clave = Object.keys(mensajes).find((k) => control.hasError(k));
    return clave ? mensajes[clave] : null;
  }
}
