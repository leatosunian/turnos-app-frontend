import { FormControl } from '@angular/forms';
import { NOMBRE_PERSONA, emailValido, obligatorio } from './validadores';

describe('obligatorio', () => {
  it('marca vacío un texto con solo espacios', () => {
    expect(obligatorio(new FormControl(''))).toEqual({ required: true });
    expect(obligatorio(new FormControl('   '))).toEqual({ required: true });
    expect(obligatorio(new FormControl(null))).toEqual({ required: true });
  });

  it('deja pasar un texto con algo escrito, aunque tenga espacios en las puntas', () => {
    expect(obligatorio(new FormControl(' Corte '))).toBeNull();
  });
});

describe('emailValido', () => {
  it('pide un dominio con punto', () => {
    expect(emailValido(new FormControl('ana@mail'))).toEqual({ email: true });
    expect(emailValido(new FormControl('ana mail.com'))).toEqual({ email: true });
    expect(emailValido(new FormControl('ana@mail.com'))).toBeNull();
  });

  it('ignora los espacios de las puntas y no se mete con el campo vacío', () => {
    expect(emailValido(new FormControl(' ana@mail.com '))).toBeNull();
    expect(emailValido(new FormControl(''))).toBeNull();
  });
});

describe('NOMBRE_PERSONA', () => {
  it('acepta tildes, ñ y diéresis, como el back', () => {
    expect(NOMBRE_PERSONA.test('José Muñoz')).toBe(true);
    expect(NOMBRE_PERSONA.test('Agüero')).toBe(true);
  });

  it('rechaza números y signos', () => {
    expect(NOMBRE_PERSONA.test('Ana2')).toBe(false);
    expect(NOMBRE_PERSONA.test('Ana-María')).toBe(false);
  });
});
