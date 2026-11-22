import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { environment } from '../../../../environments/environment';
import { HomePage, PERFIL_DE_EJEMPLO } from './home-page';

describe('HomePage', () => {
  let fixture: ComponentFixture<HomePage>;
  let http: HttpTestingController;
  let pantalla: HTMLElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HomePage],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    fixture = TestBed.createComponent(HomePage);
    http = TestBed.inject(HttpTestingController);
    pantalla = fixture.nativeElement;
    fixture.detectChanges();
  });

  afterEach(() => http.verify());

  function link(texto: string): HTMLAnchorElement | undefined {
    return Array.from(pantalla.querySelectorAll('a')).find((a) =>
      a.textContent?.trim().startsWith(texto),
    );
  }

  it('tiene las secciones a las que apuntan el header y el footer', () => {
    http.expectOne(`${environment.apiUrl}/business-types`).flush([]);
    for (const id of ['como', 'funciones', 'rubros']) {
      expect(pantalla.querySelector(`#${id}`)).not.toBeNull();
    }
  });

  it('muestra los rubros del back con su nombre y ordenados', async () => {
    http.expectOne(`${environment.apiUrl}/business-types`).flush([
      { id: '1', name: 'SPA', deleted: false },
      { id: '2', name: 'PELUQUERIA', deleted: false },
      { id: '3', name: 'GYM', deleted: false },
      { id: '4', name: 'TALLER', deleted: true },
    ]);
    await fixture.whenStable();
    const filas = Array.from(pantalla.querySelectorAll('#rubros li'));
    expect(filas.map((li) => li.querySelector('.nombre-rubro')?.textContent?.trim())).toEqual([
      'Gimnasio',
      'Peluquería',
      'Spa',
    ]);
    // cada uno con su numero de dos cifras
    expect(filas.map((li) => li.querySelector('.font-mono')?.textContent?.trim())).toEqual([
      '01',
      '02',
      '03',
    ]);
  });

  it('si el back falla, la sección de rubros queda sin lista', async () => {
    http
      .expectOne(`${environment.apiUrl}/business-types`)
      .flush(null, { status: 500, statusText: 'Error' });
    await fixture.whenStable();
    expect(pantalla.querySelector('#rubros ul')).toBeNull();
    expect(pantalla.querySelector('#rubros h2')).not.toBeNull();
  });

  it('los botones llevan a crear cuenta, al perfil de ejemplo y a mis turnos', () => {
    http.expectOne(`${environment.apiUrl}/business-types`).flush([]);
    expect(link('Crear mi negocio gratis')?.getAttribute('href')).toBe('/ingresar?modo=crear');
    expect(link('Ver negocio de ejemplo')?.getAttribute('href')).toBe(`/${PERFIL_DE_EJEMPLO}`);
    expect(link('¿Sos cliente?')?.getAttribute('href')).toBe('/mis-turnos');
  });
});
