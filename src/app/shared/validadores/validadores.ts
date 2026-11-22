import { AbstractControl, ValidationErrors } from '@angular/forms';

// Validadores que comparten los formularios de la app (ingresar, registro, mi negocio, servicios,
// equipo y la reserva publica). Estan aca para que todos los campos del mismo tipo se validen
// igual y con las mismas reglas que el back.

// Como Validators.required pero para campos de texto: un valor con solo espacios tambien cuenta
// como vacio. Hace falta porque los formularios mandan el texto con trim(), asi que "   " pasaba
// el required del front y llegaba vacio al back, que lo rechazaba con un error generico abajo de
// todo. Devuelve la misma clave required, asi los mensajes de cada pantalla siguen andando.
// Por ejemplo "   " da error y " Corte " pasa.
export function obligatorio(control: AbstractControl): ValidationErrors | null {
  const valor: unknown = control.value;
  if (typeof valor === 'string') return valor.trim() ? null : { required: true };
  return valor === null || valor === undefined ? { required: true } : null;
}

// Alcanza con que tenga algo, una arroba, algo, un punto y algo. Validators.email de Angular deja
// pasar ana@mail (sin el .com) porque sigue la norma al pie de la letra, y eso para una persona es
// un email mal escrito. Por ejemplo ana@mail.com pasa y ana@mail no.
export const FORMATO_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Reemplaza a Validators.email. Ignora los espacios de las puntas (los formularios mandan el
// email con trim) y si el campo esta vacio no dice nada, eso lo avisa obligatorio. Devuelve la
// clave email, igual que el de Angular.
export function emailValido(control: AbstractControl): ValidationErrors | null {
  const valor = typeof control.value === 'string' ? control.value.trim() : '';
  if (!valor) return null;
  return FORMATO_EMAIL.test(valor) ? null : { email: true };
}

// Nombre y apellido de una persona: solo letras y espacios, con tildes, ñ y dieresis. Es la misma
// regla que el back (la clase \p{L} de Java, que es cualquier letra de cualquier idioma). El
// flag u hace que \p{L} funcione en JavaScript. Por ejemplo José Muñoz y Agüero pasan, Ana2 no.
export const NOMBRE_PERSONA = /^[\p{L}\s]+$/u;
