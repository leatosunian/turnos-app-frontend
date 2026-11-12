import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Observable, of, throwError } from 'rxjs';
import { ApiError } from '../../../core/models/api-error';
import { BusinessResponse, BusinessTypeResponse } from '../../../core/models/negocio';
import { AdminNegocioService } from '../../../core/services/admin-negocio-service';
import { RubroService } from '../../../core/services/rubro-service';
import { AdminRubrosPage, claveRubro, negociosPorRubro } from './admin-rubros-page';

const rubro = (id: string, name: string): BusinessTypeResponse => ({ id, name, deleted: false });

const PELU = rubro('r-1', 'Peluquería');
const TALLER = rubro('r-2', 'Taller');
const BARBERIA = rubro('r-3', 'Barbería');

describe('claveRubro', () => {
  it('ignora mayúsculas, tildes y espacios de más', () => {
    expect(claveRubro('  PELUQUERIA ')).toBe(claveRubro('Peluquería'));
    expect(claveRubro('Spa   y  estética')).toBe('spa y estetica');
  });
});

// solo lo que usa el conteo
const negocio = (deleted: boolean, rubros: string[]) =>
  ({ deleted, businessTypes: rubros.map((id) => ({ id })) }) as BusinessResponse;

describe('negociosPorRubro', () => {
  it('cuenta los negocios activos de cada rubro', () => {
    const negocios = [negocio(false, ['a', 'b']), negocio(false, ['a']), negocio(true, ['a'])];
    expect(negociosPorRubro(negocios)).toEqual(
      new Map([
        ['a', 2],
        ['b', 1],
      ]),
    );
  });
});

describe('AdminRubrosPage', () => {
  let fixture: ComponentFixture<AdminRubrosPage>;
  let servicio: {
    listar: ReturnType<typeof vi.fn<() => Observable<BusinessTypeResponse[]>>>;
    negocios: ReturnType<typeof vi.fn<() => Observable<BusinessResponse[]>>>;
    crear: ReturnType<typeof vi.fn<(name: string) => Observable<BusinessTypeResponse>>>;
    editar: ReturnType<
      typeof vi.fn<(id: string, name: string) => Observable<BusinessTypeResponse>>
    >;
    eliminar: ReturnType<typeof vi.fn<(id: string) => Observable<void>>>;
  };

  const el = () => fixture.nativeElement as HTMLElement;
  const texto = () => el().textContent?.replace(/\s+/g, ' ') ?? '';
  const nombres = () =>
    [...el().querySelectorAll('ul[aria-label="Rubros"] li:not([aria-hidden]) span.truncate')].map(
      (s) => s.textContent!.trim(),
    );
  const boton = (etiqueta: string) =>
    el().querySelector(`button[aria-label="${etiqueta}"]`) as HTMLButtonElement;
  const dialogo = () => el().querySelector('[role="alertdialog"]') as HTMLElement | null;

  async function refrescar() {
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  }

  async function crearPagina() {
    fixture = TestBed.createComponent(AdminRubrosPage);
    await refrescar();
  }

  async function escribirNuevo(valor: string) {
    const input = el().querySelector(
      'form[aria-labelledby="nuevo-rubro"] input',
    ) as HTMLInputElement;
    input.value = valor;
    input.dispatchEvent(new Event('input'));
    await refrescar();
  }

  async function enviar(form: HTMLFormElement) {
    form.dispatchEvent(new Event('submit', { cancelable: true }));
    await refrescar();
  }

  const formNuevo = () =>
    el().querySelector('form[aria-labelledby="nuevo-rubro"]') as HTMLFormElement;

  beforeEach(() => {
    servicio = {
      listar: vi.fn(() => of([TALLER, PELU, BARBERIA])),
      negocios: vi.fn(() =>
        of([negocio(false, ['r-1']), negocio(false, ['r-1']), negocio(false, ['r-1', 'r-2'])]),
      ),
      crear: vi.fn(),
      editar: vi.fn(),
      eliminar: vi.fn(),
    };
    TestBed.configureTestingModule({
      imports: [AdminRubrosPage],
      providers: [
        { provide: RubroService, useValue: servicio },
        { provide: AdminNegocioService, useValue: { listar: servicio.negocios } },
      ],
    });
  });

  it('lista los rubros en orden alfabético con cuántos negocios los usan', async () => {
    await crearPagina();

    expect(texto()).toContain('3 rubros');
    expect(nombres()).toEqual(['Barbería', 'Peluquería', 'Taller']);
    const filaPelu = boton('Editar Peluquería').closest('li')!;
    expect(filaPelu.textContent!.replace(/\s+/g, ' ')).toContain('3 negocios');
  });

  it('si no se pueden contar los negocios, lista igual', async () => {
    servicio.negocios.mockReturnValue(throwError(() => ({ status: 403 })));
    await crearPagina();

    expect(nombres()).toHaveLength(3);
    expect(boton('Editar Peluquería').closest('li')!.textContent).not.toMatch(/\d/);
  });

  it('crea un rubro con nombre único', async () => {
    servicio.crear.mockReturnValue(of(rubro('r-4', 'Kinesiología')));
    await crearPagina();

    await escribirNuevo('  Kinesiología ');
    await enviar(formNuevo());

    expect(servicio.crear).toHaveBeenCalledWith('Kinesiología');
    expect(nombres()).toContain('Kinesiología');
    expect(texto()).toContain('Creaste el rubro Kinesiología.');
    expect((formNuevo().querySelector('input') as HTMLInputElement).value).toBe('');
  });

  it('no deja crear un nombre vacío ni repetido', async () => {
    await crearPagina();

    await enviar(formNuevo());
    expect(texto()).toContain('Escribí un nombre.');

    await escribirNuevo('PELUQUERIA');
    await enviar(formNuevo());
    expect(texto()).toContain('Ya existe el rubro Peluquería.');
    expect(servicio.crear).not.toHaveBeenCalled();
  });

  it('muestra el error del back al crear', async () => {
    servicio.crear.mockReturnValue(
      throwError(
        () => ({ status: 409, message: ' Ya existe un rubro con ese nombre ' }) satisfies ApiError,
      ),
    );
    await crearPagina();

    await escribirNuevo('Gym');
    await enviar(formNuevo());

    expect(texto()).toContain('Ya existe un rubro con ese nombre');
  });

  it('edita el nombre en la misma fila', async () => {
    servicio.editar.mockReturnValue(of(rubro('r-2', 'Taller mecánico')));
    await crearPagina();

    boton('Editar Taller').click();
    await refrescar();
    const input = el().querySelector(
      'input[aria-label="Nuevo nombre para Taller"]',
    ) as HTMLInputElement;
    input.value = 'Taller mecánico';
    input.dispatchEvent(new Event('input'));
    await enviar(input.closest('form')!);

    expect(servicio.editar).toHaveBeenCalledWith('r-2', 'Taller mecánico');
    expect(nombres()).toContain('Taller mecánico');
    expect(texto()).toContain('Guardaste el rubro Taller mecánico.');
  });

  it('al editar no deja usar el nombre de otro rubro, pero sí el propio', async () => {
    await crearPagina();

    boton('Editar Taller').click();
    await refrescar();
    const input = el().querySelector(
      'input[aria-label="Nuevo nombre para Taller"]',
    ) as HTMLInputElement;
    input.value = 'barberia';
    input.dispatchEvent(new Event('input'));
    await enviar(input.closest('form')!);
    expect(texto()).toContain('Ya existe el rubro Barbería.');

    input.value = 'Taller';
    input.dispatchEvent(new Event('input'));
    await enviar(input.closest('form')!);
    expect(servicio.editar).not.toHaveBeenCalled();
    expect(el().querySelector('input[aria-label="Nuevo nombre para Taller"]')).toBeNull();
  });

  it('eliminar pide confirmación, avisa si lo usan negocios y lo saca de la lista', async () => {
    servicio.eliminar.mockReturnValue(of(undefined));
    await crearPagina();

    boton('Eliminar Peluquería').click();
    await refrescar();
    expect(dialogo()!.textContent).toContain('¿Eliminar el rubro Peluquería?');
    expect(dialogo()!.textContent).toContain('Lo usan 3 negocios');
    expect(servicio.eliminar).not.toHaveBeenCalled();

    [...dialogo()!.querySelectorAll('button')]
      .find((b) => b.textContent?.trim() === 'Eliminar')!
      .click();
    await refrescar();

    expect(servicio.eliminar).toHaveBeenCalledWith('r-1');
    expect(dialogo()).toBeNull();
    expect(nombres()).toEqual(['Barbería', 'Taller']);
    expect(texto()).toContain('Eliminaste el rubro Peluquería.');
  });

  it('si falla la carga deja reintentar', async () => {
    servicio.listar.mockReturnValue(throwError(() => ({ status: 500 })));
    await crearPagina();
    expect(texto()).toContain('No pudimos traer los rubros');

    servicio.listar.mockReturnValue(of([PELU]));
    [...el().querySelectorAll('button')]
      .find((b) => b.textContent?.includes('Reintentar'))!
      .click();
    await refrescar();
    expect(nombres()).toEqual(['Peluquería']);
  });
});
