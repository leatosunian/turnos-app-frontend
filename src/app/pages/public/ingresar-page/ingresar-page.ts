import { Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import {
  AbstractControl,
  NonNullableFormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { map, Observable } from 'rxjs';
import { ApiError } from '../../../core/models/api-error';
import { UserResponse } from '../../../core/models/usuario';
import { AuthService } from '../../../core/services/auth-service';
import { Boton } from '../../../shared/components/boton/boton';
import { Campo } from '../../../shared/components/campo/campo';
import { Pastilla } from '../../../shared/components/pastilla/pastilla';

type Modo = 'ingresar' | 'crear';
type TipoCuenta = 'negocio' | 'cliente';

interface Paso {
  titulo: string;
  detalle: string;
}

// mismas reglas que el back (RegisterRequest), así el error aparece antes de mandar el form
const SOLO_LETRAS = /^[a-zA-Z\s]+$/;
const CLAVE_SEGURA = /^(?=.*[A-Z])(?=.*[a-z])(?=.*[0-9])[\x00-\x7F]+$/;

const PASOS: Record<TipoCuenta, Paso[]> = {
  negocio: [
    { titulo: 'Datos del negocio y tu link', detalle: 'Nombre, rubro, teléfono y slug.' },
    { titulo: 'Servicios y precios', detalle: 'Duración, precio y descripción.' },
    { titulo: 'Días y horarios', detalle: 'Plantillas por día y profesional.' },
    { titulo: 'Compartís el link', detalle: 'Y empiezan a entrar reservas.' },
  ],
  cliente: [
    { titulo: 'Entrás al link del negocio', detalle: 'Te lo pasa el local o lo ves en sus redes.' },
    { titulo: 'Elegís servicio y horario', detalle: 'Solo aparecen los turnos libres.' },
    { titulo: 'Pagás la seña', detalle: 'Y el turno queda confirmado.' },
    { titulo: 'Seguís tus turnos', detalle: 'Los ves y los cancelás desde Mis turnos.' },
  ],
};

@Component({
  imports: [Boton, Campo, Pastilla, ReactiveFormsModule],
  selector: 'app-ingresar-page',
  styleUrl: './ingresar-page.css',
  templateUrl: './ingresar-page.html',
})
export class IngresarPage {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly fb = inject(NonNullableFormBuilder);

  // el modo va en la URL para que "Crear mi negocio" del header abra directo la pestaña
  protected readonly modo = toSignal(
    inject(ActivatedRoute).queryParamMap.pipe(
      map((params): Modo => (params.get('modo') === 'crear' ? 'crear' : 'ingresar')),
    ),
    { initialValue: 'ingresar' },
  );
  protected readonly tipo = signal<TipoCuenta>('negocio');
  protected readonly tiposCuenta: { valor: TipoCuenta; titulo: string; detalle: string }[] = [
    { valor: 'negocio', titulo: 'Tengo un negocio', detalle: 'Doy turnos y cobro señas' },
    { valor: 'cliente', titulo: 'Quiero reservar', detalle: 'Veo y cancelo mis turnos' },
  ];
  protected readonly mensajes = {
    nombre: {
      required: 'Ingresá tu nombre y apellido.',
      pattern: 'Usá solo letras y espacios, sin tildes ni ñ.',
    },
    email: { required: 'Ingresá tu email.', email: 'Revisá el email, no parece válido.' },
    claveIngreso: { required: 'Ingresá tu contraseña.' },
    claveNueva: {
      required: 'Ingresá una contraseña.',
      minlength: 'Tiene que tener al menos 8 caracteres.',
      maxlength: 'Puede tener hasta 64 caracteres.',
      pattern: 'Tiene que tener una mayúscula, una minúscula y un número, sin tildes ni ñ.',
    },
  };

  protected readonly enviado = signal(false);
  protected readonly enviando = signal(false);
  protected readonly errorServidor = signal<string | null>(null);

  protected readonly pasos = computed(
    () => PASOS[this.modo() === 'crear' ? this.tipo() : 'negocio'],
  );
  protected readonly textoBoton = computed(() => {
    if (this.modo() === 'ingresar') return this.enviando() ? 'Ingresando…' : 'Ingresar';
    if (this.enviando()) return 'Creando cuenta…';
    return this.tipo() === 'negocio' ? 'Crear cuenta y configurar mi negocio' : 'Crear cuenta';
  });

  protected readonly ingreso = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', Validators.required],
  });

  protected readonly registro = this.fb.group({
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

  cambiarModo(modo: Modo): void {
    if (modo === this.modo()) return;
    this.enviado.set(false);
    this.errorServidor.set(null);
    this.router.navigate([], {
      queryParams: { modo: modo === 'crear' ? 'crear' : null },
      replaceUrl: true,
    });
  }

  // con dos pestañas, cualquier flecha pasa a la otra
  moverConFlechas(destino: HTMLElement): void {
    this.cambiarModo(this.modo() === 'ingresar' ? 'crear' : 'ingresar');
    destino.focus();
  }

  enviar(): void {
    this.enviado.set(true);
    this.errorServidor.set(null);

    const form = this.modo() === 'ingresar' ? this.ingreso : this.registro;
    if (form.invalid || this.enviando()) return;

    this.enviando.set(true);
    this.pedido().subscribe({
      next: () => this.auth.redirigirSegunRol(),
      error: (error: ApiError) => {
        this.enviando.set(false);
        this.errorServidor.set(this.mensajeDeError(error));
      },
    });
  }

  protected error(control: AbstractControl, mensajes: Record<string, string>): string | null {
    if (!control.errors || !(control.touched || this.enviado())) return null;
    const clave = Object.keys(mensajes).find((k) => control.hasError(k));
    return clave ? mensajes[clave] : null;
  }

  private pedido(): Observable<UserResponse> {
    if (this.modo() === 'ingresar') {
      return this.auth.login(this.ingreso.getRawValue());
    }
    const { nombre, email, password } = this.registro.getRawValue();
    const datos = { name: nombre.trim(), email, password };
    return this.tipo() === 'negocio'
      ? this.auth.registrar(datos)
      : this.auth.registrarCliente(datos);
  }

  private mensajeDeError(error: ApiError): string {
    // en el login el back responde 401 en ingles, y 400 si la clave no cumple el formato
    if (this.modo() === 'ingresar' && (error.status === 401 || error.status === 400)) {
      return 'El email o la contraseña no son correctos.';
    }
    // los errores de validación vienen  "password: La contraseña..., name: ..."
    return error.message.replace(/(^|, )(name|email|password): /g, '$1');
  }
}
