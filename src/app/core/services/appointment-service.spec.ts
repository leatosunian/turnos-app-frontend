import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { environment } from '../../../environments/environment';
import { Pagina } from '../models/pagina';
import { AppointmentResponse } from '../models/turno';
import { AppointmentService } from './appointment-service';

const URL = environment.apiUrl;
const TURNO = { id: 't-1', status: 'BOOKED' } as AppointmentResponse;

describe('AppointmentService', () => {
  let service: AppointmentService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(AppointmentService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('listar pide la página con orden por defecto, más nuevos primero', () => {
    let pagina: Pagina<AppointmentResponse> | undefined;
    service.listar('n-1').subscribe((p) => (pagina = p));

    const req = httpMock.expectOne((r) => r.url === `${URL}/businesses/n-1/appointments`);
    expect(req.request.params.get('page')).toBe('0');
    expect(req.request.params.get('size')).toBe('20');
    expect(req.request.params.get('sort')).toBe('startDatetime,desc');
    expect(req.request.params.has('status')).toBe(false);
    req.flush({ content: [TURNO], totalElements: 41, totalPages: 3, number: 0, size: 20 });

    expect(pagina).toEqual({ items: [TURNO], numero: 0, tamanio: 20, total: 41, totalPaginas: 3 });
  });

  it('listar manda el estado y la página, y entiende los totales adentro de "page"', () => {
    let pagina: Pagina<AppointmentResponse> | undefined;
    service.listar('n-1', { status: 'AWAITING_PAYMENT', page: 2 }).subscribe((p) => (pagina = p));

    const req = httpMock.expectOne((r) => r.url === `${URL}/businesses/n-1/appointments`);
    expect(req.request.params.get('status')).toBe('AWAITING_PAYMENT');
    expect(req.request.params.get('page')).toBe('2');
    req.flush({ content: [], page: { size: 20, number: 2, totalElements: 45, totalPages: 3 } });

    expect(pagina?.total).toBe(45);
    expect(pagina?.numero).toBe(2);
  });

  it('contar pide una página de 1 y devuelve el total', () => {
    let total: number | undefined;
    service.contar('n-1', 'CANCELLED').subscribe((t) => (total = t));

    const req = httpMock.expectOne((r) => r.url === `${URL}/businesses/n-1/appointments`);
    expect(req.request.params.get('size')).toBe('1');
    expect(req.request.params.get('status')).toBe('CANCELLED');
    req.flush({ content: [TURNO], totalElements: 11 });

    expect(total).toBe(11);
  });

  it('deHoy pide los turnos del día', () => {
    let turnos: AppointmentResponse[] | undefined;
    service.deHoy('n-1').subscribe((t) => (turnos = t));

    const req = httpMock.expectOne(`${URL}/businesses/n-1/appointments/today`);
    expect(req.request.method).toBe('GET');
    req.flush([TURNO]);

    expect(turnos).toEqual([TURNO]);
  });

  it('suspender y eliminar usan su endpoint', () => {
    service.suspender('t-1').subscribe();
    const suspender = httpMock.expectOne(`${URL}/appointments/t-1/suspend`);
    expect(suspender.request.method).toBe('PUT');
    suspender.flush(TURNO);

    service.eliminar('t-2').subscribe();
    const eliminar = httpMock.expectOne(`${URL}/appointments/t-2`);
    expect(eliminar.request.method).toBe('DELETE');
    eliminar.flush(null);
  });
});
