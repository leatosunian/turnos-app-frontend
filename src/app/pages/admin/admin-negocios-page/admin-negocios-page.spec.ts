import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Observable, of, throwError } from 'rxjs';
import { ApiError } from '../../../core/models/api-error';
import { BusinessResponse } from '../../../core/models/negocio';
import { UserResponse } from '../../../core/models/usuario';
import { AdminNegocioService } from '../../../core/services/admin-negocio-service';
import { AdminUsuarioService } from '../../../core/services/admin-usuario-service';
import { AdminNegociosPage } from './admin-negocios-page';

function negocio(
  id: string,
  name: string,
  rubros: string[],
  extra: Partial<BusinessResponse> = {},
): BusinessResponse {
  return {
    id,
    name,
    email: `${id}@mail.com`,
    slug: name.toLowerCase().replace(/\s+/g, '-'),
    phone: '1155550000',
    description: null,
    automaticSchedule: true,
    scheduleEnd: null,
    scheduleDaysToCreate: 7,
    scheduleAnticipation: 0,
    deleted: false,
    ownerId: `u-${id}`,
    businessTypes: rubros.map((r) => ({ id: `r-${r}`, name: r, deleted: false })),
    ...extra,
  };
}

const usuario = (id: string, name: string) => ({ id, name }) as UserResponse;

const MALBEC = negocio('1', 'Estudio Malbec', ['Peluquería', 'Barbería']);
const SPA = negocio('2', 'Spa Origen', ['Spa']);
const GYM = negocio('3', 'Fit Box', ['Gym'], { deleted: true });

describe('AdminNegociosPage', () => {
  let fixture: ComponentFixture<AdminNegociosPage>;
  let servicio: {
    negocios: ReturnType<typeof vi.fn<() => Observable<BusinessResponse[]>>>;
    usuarios: ReturnType<typeof vi.fn<() => Observable<UserResponse[]>>>;
    darDeBaja: ReturnType<typeof vi.fn<(id: string) => Observable<void>>>;
  };

  const el = () => fixture.nativeElement as HTMLElement;
  const texto = () => el().textContent?.replace(/\s+/g, ' ') ?? '';
  // cada celda por separado, unidas con un espacio (textContent las pega)
  const filas = () =>
    [...el().querySelectorAll('tbody tr')].map((tr) => {
      const partes: string[] = [];
      const recorrido = document.createTreeWalker(tr, NodeFilter.SHOW_TEXT);
      while (recorrido.nextNode()) partes.push(recorrido.currentNode.textContent!.trim());
      return partes.filter(Boolean).join(' ').replace(/\s+/g, ' ');
    });
  const dialogo = () => el().querySelector('[role="alertdialog"]') as HTMLElement | null;

  async function refrescar() {
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  }

  async function crear(negocios: BusinessResponse[] = [GYM, SPA, MALBEC]) {
    servicio.negocios.mockReturnValue(of(negocios));
    fixture = TestBed.createComponent(AdminNegociosPage);
    await refrescar();
  }

  async function escribir(selector: string, valor: string, evento: 'input' | 'change') {
    const campo = el().querySelector(selector) as HTMLInputElement | HTMLSelectElement;
    campo.value = valor;
    campo.dispatchEvent(new Event(evento));
    await refrescar();
  }

  beforeEach(() => {
    servicio = {
      negocios: vi.fn(),
      usuarios: vi.fn(() =>
        of([
          usuario('u-1', 'Lucía Morales'),
          usuario('u-2', 'Ana Paredes'),
          usuario('u-3', 'Martín Gómez'),
        ]),
      ),
      darDeBaja: vi.fn(),
    };
    TestBed.configureTestingModule({
      imports: [AdminNegociosPage],
      providers: [
        {
          provide: AdminNegocioService,
          useValue: { listar: servicio.negocios, darDeBaja: servicio.darDeBaja },
        },
        { provide: AdminUsuarioService, useValue: { listar: servicio.usuarios } },
      ],
    });
  });

  it('lista negocio, slug, dueño, rubros y estado, con los activos primero', async () => {
    await crear();

    expect(texto()).toContain('3 negocios · 1 de baja');
    expect(filas()).toEqual([
      'Estudio Malbec /estudio-malbec Lucía Morales Peluquería · Barbería Activo Dar de baja',
      'Spa Origen /spa-origen Ana Paredes Spa Activo Dar de baja',
      'Fit Box /fit-box Martín Gómez Gym De baja',
    ]);
  });

  it('si no se pueden traer los usuarios, muestra la lista sin el dueño', async () => {
    servicio.usuarios.mockReturnValue(throwError(() => ({ status: 500 })));
    await crear();

    expect(filas()[0]).toBe(
      'Estudio Malbec /estudio-malbec Peluquería · Barbería Activo Dar de baja',
    );
  });

  it('busca por nombre, slug o dueño sin importar tildes', async () => {
    await crear();

    await escribir('input[type="search"]', 'lucia', 'input');
    expect(filas()).toHaveLength(1);
    expect(filas()[0]).toContain('Estudio Malbec');

    await escribir('input[type="search"]', 'spa-orig', 'input');
    expect(filas()[0]).toContain('Spa Origen');

    await escribir('input[type="search"]', 'nada', 'input');
    expect(texto()).toContain('Ningún negocio coincide');
  });

  it('filtra por rubro', async () => {
    await crear();

    await escribir('select', 'r-Spa', 'change');
    expect(filas()).toEqual(['Spa Origen /spa-origen Ana Paredes Spa Activo Dar de baja']);
  });

  it('pagina de a 10', async () => {
    const muchos = Array.from({ length: 23 }, (_, i) =>
      negocio(String(i), `Negocio ${String(i).padStart(2, '0')}`, ['Spa']),
    );
    await crear(muchos);

    expect(filas()).toHaveLength(10);
    expect(texto()).toContain('1–10 de 23');

    (el().querySelector('[aria-label="Página siguiente"]') as HTMLButtonElement).click();
    await refrescar();
    expect(filas()[0]).toContain('Negocio 10');
    expect(texto()).toContain('11–20 de 23');
  });

  it('dar de baja pide confirmación y, al confirmar, marca el negocio', async () => {
    servicio.darDeBaja.mockReturnValue(of(undefined));
    await crear();

    (
      el().querySelector('button[aria-label="Dar de baja Spa Origen"]') as HTMLButtonElement
    ).click();
    await refrescar();
    expect(dialogo()!.textContent).toContain('¿Dar de baja Spa Origen?');
    expect(servicio.darDeBaja).not.toHaveBeenCalled();

    const confirmar = [...dialogo()!.querySelectorAll('button')].find(
      (b) => b.textContent?.trim() === 'Dar de baja',
    )!;
    confirmar.click();
    await refrescar();

    expect(servicio.darDeBaja).toHaveBeenCalledWith('2');
    expect(dialogo()).toBeNull();
    expect(texto()).toContain('Spa Origen quedó dado de baja.');
    expect(texto()).toContain('3 negocios · 2 de baja');
    expect(el().querySelector('button[aria-label="Dar de baja Spa Origen"]')).toBeNull();
  });

  it('si el back rechaza la baja, el diálogo muestra el motivo', async () => {
    servicio.darDeBaja.mockReturnValue(
      throwError(
        () =>
          ({
            status: 409,
            message: 'El negocio tiene turnos pendientes y no puede ser eliminado',
          }) satisfies ApiError,
      ),
    );
    await crear();

    (
      el().querySelector('button[aria-label="Dar de baja Spa Origen"]') as HTMLButtonElement
    ).click();
    await refrescar();
    [...dialogo()!.querySelectorAll('button')]
      .find((b) => b.textContent?.trim() === 'Dar de baja')!
      .click();
    await refrescar();

    expect(dialogo()!.textContent).toContain('tiene turnos pendientes');
  });

  it('si falla la carga deja reintentar', async () => {
    servicio.negocios.mockReturnValue(throwError(() => ({ status: 500 })));
    fixture = TestBed.createComponent(AdminNegociosPage);
    await refrescar();
    expect(texto()).toContain('No pudimos traer los negocios');

    servicio.negocios.mockReturnValue(of([SPA]));
    [...el().querySelectorAll('button')]
      .find((b) => b.textContent?.includes('Reintentar'))!
      .click();
    await refrescar();
    expect(filas()).toHaveLength(1);
  });
});
