import { Component, OnInit, inject, input, output, signal } from '@angular/core';
import {
  AbstractControl,
  NonNullableFormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { ApiError } from '../../../../core/models/api-error';
import { UserResponse } from '../../../../core/models/usuario';
import { EmpleadoService } from '../../../../core/services/empleado-service';
import { Boton } from '../../../../shared/components/boton/boton';
import { Campo } from '../../../../shared/components/campo/campo';
import { Dialogo } from '../../../../shared/components/dialogo/dialogo';
import {
  NOMBRE_PERSONA,
  emailValido,
  obligatorio,
} from '../../../../shared/validadores/validadores';

// mismas reglas que el back (EmployeeRequest), iguales a las del registro
const CLAVE_SEGURA = /^(?=.*[A-Z])(?=.*[a-z])(?=.*[0-9])[\x00-\x7F]+$/;

// Alta y edicion de un profesional, desde Servicios y equipo.
// Al agregar la contraseña es obligatoria, porque con ese email y esa clave entra al panel.
// Al editar es opcional: el back (EmployeeUpdateRequest) solo la cambia si viene escrita, asi que
// el dueño puede corregir el nombre o el email sin tener que inventarle una clave nueva.
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
    nombre: ['', [obligatorio, Validators.maxLength(100), Validators.pattern(NOMBRE_PERSONA)]],
    email: ['', [obligatorio, emailValido]],
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
      maxlength: 'Puede tener hasta 100 caracteres.',
      pattern: 'Usá solo letras y espacios, sin números ni signos.',
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
      // al editar la contraseña puede quedar vacia; si se escribe, tiene que cumplir las reglas
      this.form.controls.password.removeValidators(Validators.required);
      this.form.controls.password.updateValueAndValidity();
    }
  }

  protected guardar(): void {
    this.enviado.set(true);
    this.errorServidor.set(null);
    if (this.form.invalid || this.guardando()) return;

    const { nombre, email, password } = this.form.getRawValue();
    const datos = { name: nombre.trim().replace(/\s+/g, ' '), email: email.trim() };
    const empleado = this.empleado();
    // al editar, la contraseña vacia no se manda y el back deja la que tenia
    const pedido = empleado
      ? this.empleados.actualizar(empleado.id, password ? { ...datos, password } : datos)
      : this.empleados.crear(this.businessId(), { ...datos, password });

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
