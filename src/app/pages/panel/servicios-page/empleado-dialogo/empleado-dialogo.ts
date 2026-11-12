import { Component, OnInit, inject, input, output, signal } from '@angular/core';
import {
  AbstractControl,
  NonNullableFormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { ApiError } from '../../../../core/models/api-error';
import { EmployeeRequest } from '../../../../core/models/empleado';
import { UserResponse } from '../../../../core/models/usuario';
import { EmpleadoService } from '../../../../core/services/empleado-service';
import { Boton } from '../../../../shared/components/boton/boton';
import { Campo } from '../../../../shared/components/campo/campo';
import { Dialogo } from '../dialogo/dialogo';

// mismas reglas que el back (EmployeeRequest), iguales a las del registro
const SOLO_LETRAS = /^[a-zA-Z\s]+$/;
const CLAVE_SEGURA = /^(?=.*[A-Z])(?=.*[a-z])(?=.*[0-9])[\x00-\x7F]+$/;

/**
 * Alta y edición de un profesional. El back pide la contraseña también al editar, así que
 * editar siempre le pone una nueva: se avisa en el formulario.
 */
@Component({
  selector: 'app-empleado-dialogo',
  imports: [Boton, Campo, Dialogo, ReactiveFormsModule],
  templateUrl: './empleado-dialogo.html',
})
export class EmpleadoDialogo implements OnInit {
  readonly businessId = input.required<string>();
  /** null para agregar uno nuevo. */
  readonly empleado = input<UserResponse | null>(null);
  readonly guardado = output<UserResponse>();
  readonly cancelado = output<void>();

  private readonly empleados = inject(EmpleadoService);

  protected readonly form = inject(NonNullableFormBuilder).group({
    nombre: ['', [Validators.required, Validators.pattern(SOLO_LETRAS)]],
    email: ['', [Validators.required, Validators.email]],
    password: [
      '',
      [
        Validators.required,
        Validators.minLength(8),
        Validators.maxLength(64),
        Validators.pattern(CLAVE_SEGURA),
      ],
    ],
  });

  protected readonly mensajes = {
    nombre: {
      required: 'Ingresá el nombre y apellido.',
      pattern: 'Usá solo letras y espacios, sin tildes ni ñ.',
    },
    email: { required: 'Ingresá el email.', email: 'Revisá el email, no parece válido.' },
    password: {
      required: 'Ingresá una contraseña.',
      minlength: 'Tiene que tener al menos 8 caracteres.',
      maxlength: 'Puede tener hasta 64 caracteres.',
      pattern: 'Tiene que tener una mayúscula, una minúscula y un número, sin tildes ni ñ.',
    },
  };

  protected readonly enviado = signal(false);
  protected readonly guardando = signal(false);
  protected readonly errorServidor = signal<string | null>(null);

  ngOnInit(): void {
    const empleado = this.empleado();
    if (empleado) {
      this.form.patchValue({ nombre: empleado.name, email: empleado.email });
    }
  }

  protected guardar(): void {
    this.enviado.set(true);
    this.errorServidor.set(null);
    if (this.form.invalid || this.guardando()) return;

    const { nombre, email, password } = this.form.getRawValue();
    const datos: EmployeeRequest = { name: nombre.trim(), email: email.trim(), password };
    const empleado = this.empleado();
    const pedido = empleado
      ? this.empleados.actualizar(empleado.id, datos)
      : this.empleados.crear(this.businessId(), datos);

    this.guardando.set(true);
    pedido.subscribe({
      next: (guardado) => this.guardado.emit(guardado),
      error: (error: ApiError) => {
        this.guardando.set(false);
        this.errorServidor.set(error.message.replace(/(^|, )(name|email|password): /g, '$1'));
      },
    });
  }

  protected error(control: AbstractControl, mensajes: Record<string, string>): string | null {
    if (!control.errors || !(control.touched || this.enviado())) return null;
    const clave = Object.keys(mensajes).find((k) => control.hasError(k));
    return clave ? mensajes[clave] : null;
  }
}
