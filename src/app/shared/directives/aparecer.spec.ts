import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { CargadorService } from '../../core/services/cargador-service';
import { Aparecer } from './aparecer';

@Component({
  imports: [Aparecer],
  template: `<div appAparecer></div>
    <div appAparecer="120"></div>`,
})
class Prueba {}

describe('Aparecer', () => {
  afterEach(() => vi.unstubAllGlobals());

  function crear() {
    const fixture = TestBed.createComponent(Prueba);
    fixture.detectChanges();
    TestBed.tick();
    return Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('div'));
  }

  it('sin IntersectionObserver muestra todo directo', () => {
    vi.stubGlobal('IntersectionObserver', undefined);
    const [primero, segundo] = crear();
    expect(primero.classList).toContain('aparecer-visible');
    expect(segundo.classList).toContain('aparecer-visible');
  });

  it('aparece recien cuando el elemento entra en pantalla', () => {
    // cada directiva crea su observador, asi que guardamos un aviso por elemento, en orden
    type Aviso = (entradas: Partial<IntersectionObserverEntry>[]) => void;
    const avisos: Aviso[] = [];
    vi.stubGlobal(
      'IntersectionObserver',
      class {
        constructor(callback: Aviso) {
          avisos.push(callback);
        }
        observe() {}
        disconnect() {}
      },
    );
    const [primero, segundo] = crear();
    expect(primero.classList).toContain('aparecer');
    expect(primero.classList).not.toContain('aparecer-visible');

    avisos[0]([{ isIntersecting: true }]);
    TestBed.tick();
    expect(primero.classList).toContain('aparecer-visible');
    // el segundo todavia no entro en pantalla
    expect(segundo.classList).not.toContain('aparecer-visible');
  });

  it('espera a que se vaya el loader aunque ya este en pantalla', () => {
    vi.stubGlobal('IntersectionObserver', undefined);
    const terminado = signal(false);
    TestBed.overrideProvider(CargadorService, { useValue: { terminado } });
    const [primero] = crear();
    expect(primero.classList).not.toContain('aparecer-visible');

    terminado.set(true);
    TestBed.tick();
    expect(primero.classList).toContain('aparecer-visible');
  });

  it('pasa el retraso a la variable del css', () => {
    vi.stubGlobal('IntersectionObserver', undefined);
    const [primero, segundo] = crear();
    expect(primero.style.getPropertyValue('--retraso')).toBe('0ms');
    expect(segundo.style.getPropertyValue('--retraso')).toBe('120ms');
  });
});
