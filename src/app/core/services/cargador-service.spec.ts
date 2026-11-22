import { TestBed } from '@angular/core/testing';
import { CargadorService } from './cargador-service';

describe('CargadorService', () => {
  afterEach(() => {
    vi.useRealTimers();
    document.getElementById('cargador')?.remove();
  });

  it('sin loader en la pagina arranca como terminado', () => {
    const servicio = TestBed.inject(CargadorService);
    expect(servicio.terminado()).toBe(true);
  });

  it('respeta el tiempo minimo, anima la salida y despues saca el loader', () => {
    vi.useFakeTimers();
    // la pagina "abrio" hace 200 ms, asi que falta 1 segundo para el minimo de 1200
    vi.spyOn(performance, 'now').mockReturnValue(200);
    const loader = document.createElement('div');
    loader.id = 'cargador';
    document.body.append(loader);

    const servicio = TestBed.inject(CargadorService);
    expect(servicio.terminado()).toBe(false);

    servicio.ocultar();
    vi.advanceTimersByTime(999);
    expect(loader.classList).not.toContain('cargador-saliendo');

    vi.advanceTimersByTime(1);
    expect(loader.classList).toContain('cargador-saliendo');
    expect(servicio.terminado()).toBe(false);

    vi.advanceTimersByTime(700);
    expect(loader.isConnected).toBe(false);
    expect(servicio.terminado()).toBe(true);
  });
});
