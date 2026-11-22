import { registerLocaleData } from '@angular/common';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import localeEsAr from '@angular/common/locales/es-AR';
import { LOCALE_ID } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { environment } from '../../../../../environments/environment';
import { errorInterceptor } from '../../../../core/interceptors/error-interceptor';
import { AppointmentResponse } from '../../../../core/models/turno';
import { DetalleTurnoDialogo } from './detalle-turno-dialogo';

registerLocaleData(localeEsAr);

const LIBRE: AppointmentResponse = {
  id: 'libre',
  startDatetime: '2026-11-16T16:30:00',
  endDatetime: '2026-11-16T17:15:00',
  status: 'UNBOOKED',
  clientName: null,
  clientEmail: null,
  clientPhone: null,
  price: 12000,
  businessId: 'n-1',
  serviceId: 's-1',
  serviceName: 'Corte de pelo',
  employeeId: 'e-1',
  employeeName: 'Lucia Gomez',
  createdAt: '2026-11-01T10:00:00',
  deposit: null,
};

const RESERVADO: AppointmentResponse = {
  ...LIBRE,
  id: 'reservado',
  status: 'BOOKED',
  clientName: 'Ana Prueba',
  clientEmail: 'ana@prueba.test',
  clientPhone: '11 5555-1234',
  deposit: { id: 'd-1', amount: 3600, status: 'PAID', paidAt: '2026-11-10T12:00:00' },
};

// el viernes anterior, asi el reservado sale como confirmado
const AHORA = new Date(2026, 10, 13, 12, 0);

describe('DetalleTurnoDialogo', () => {
  let fixture: ComponentFixture<DetalleTurnoDialogo>;
  let httpMock: HttpTestingController;
  let el: HTMLElement;
  let eliminado: string | null;

  async function abrir(turno: AppointmentResponse): Promise<void> {
    fixture = TestBed.createComponent(DetalleTurnoDialogo);
    fixture.componentRef.setInput('turno', turno);
    fixture.componentRef.setInput('ahora', AHORA);
    eliminado = null;
    fixture.componentInstance.eliminado.subscribe((id) => (eliminado = id));
    el = fixture.nativeElement;
    await refrescar();
  }

  async function refrescar(): Promise<void> {
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  }

  function texto(): string {
    return el.textContent!.replace(/\s+/g, ' ');
  }

  function boton(nombre: string): HTMLButtonElement | undefined {
    return [...el.querySelectorAll<HTMLButtonElement>('button')].find(
      (b) => b.textContent!.trim() === nombre,
    );
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DetalleTurnoDialogo],
      providers: [
        provideHttpClient(withInterceptors([errorInterceptor])),
        provideHttpClientTesting(),
        { provide: LOCALE_ID, useValue: 'es-AR' },
      ],
    }).compileComponents();
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('en un reservado muestra el turno y los datos de la reserva, sin eliminar', async () => {
    await abrir(RESERVADO);
    const t = texto();
    expect(t).toContain('Ana Prueba');
    expect(t).toContain('Confirmado');
    expect(t).toContain('Lunes 16 de noviembre');
    expect(t).toContain('16:30 a 17:15');
    expect(t).toContain('45 min');
    expect(t).toContain('Corte de pelo');
    expect(t).toContain('Lucia Gomez');
    expect(t).toContain('ana@prueba.test');
    expect(t).toContain('11 5555-1234');
    expect(t).toContain('Pagada');
    expect(t).toContain('Pagada el Martes 10 de noviembre');
    expect(boton('Eliminar turno')).toBeUndefined();
  });

  it('en uno cargado a mano para un cliente dice que no tiene seña', async () => {
    await abrir({ ...RESERVADO, clientEmail: null, clientPhone: null, deposit: null });
    const t = texto();
    expect(t).toContain('Sin seña');
    expect(t).toContain('No lo dejó');
  });

  it('en un libre deja eliminarlo despues de confirmar', async () => {
    await abrir(LIBRE);
    expect(texto()).toContain('Turno libre');
    expect(texto()).not.toContain('Reserva');

    boton('Eliminar turno')!.click();
    await refrescar();
    expect(texto()).toContain('¿Eliminar este turno?');

    // volver no borra nada
    boton('Volver')!.click();
    await refrescar();
    httpMock.expectNone(`${environment.apiUrl}/appointments/libre`);

    boton('Eliminar turno')!.click();
    await refrescar();
    boton('Sí, eliminar')!.click();
    await refrescar();
    const pedido = httpMock.expectOne(`${environment.apiUrl}/appointments/libre`);
    expect(pedido.request.method).toBe('DELETE');
    pedido.flush(null, { status: 204, statusText: 'No Content' });
    expect(eliminado).toBe('libre');
  });

  it('muestra el error si el back no lo deja eliminar', async () => {
    await abrir(LIBRE);
    boton('Eliminar turno')!.click();
    await refrescar();
    boton('Sí, eliminar')!.click();
    await refrescar();
    httpMock.expectOne(`${environment.apiUrl}/appointments/libre`).flush(
      {
        message: 'Error al eliminar el turno: solo los turnos sin reservar pueden ser eliminados.',
      },
      { status: 400, statusText: 'Bad Request' },
    );
    await refrescar();
    expect(texto()).toContain('solo los turnos sin reservar');
    expect(eliminado).toBeNull();
  });
});
