import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { environment } from '../../../environments/environment';
import { HorarioService } from './horario-service';

const URL = `${environment.apiUrl}/businesses/n-1`;
const TURNO = { dayNumber: 0, startTime: '10:00', endTime: '10:45', serviceId: 's-1' };

describe('HorarioService', () => {
  let service: HorarioService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(HorarioService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('semana pide los dias de atencion', () => {
    service.semana('n-1').subscribe();
    expect(httpMock.expectOne(`${URL}/schedule`).request.method).toBe('GET');
  });

  it('guardarDias hace PUT con la lista de dias', () => {
    const dias = [{ day: 'LUN' as const, dayStart: '09:00', dayEnd: '18:00', enabled: true }];
    service.guardarDias('n-1', dias).subscribe();
    const req = httpMock.expectOne(`${URL}/schedule`);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual(dias);
  });

  it('plantilla pide los turnos programados', () => {
    service.plantilla('n-1').subscribe();
    expect(httpMock.expectOne(`${URL}/appointment-schedules`).request.method).toBe('GET');
  });

  it('crearTurnoProgramado hace POST con los datos', () => {
    service.crearTurnoProgramado('n-1', TURNO).subscribe();
    const req = httpMock.expectOne(`${URL}/appointment-schedules`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(TURNO);
  });

  it('editarTurnoProgramado hace PUT sobre el turno', () => {
    service.editarTurnoProgramado('n-1', 't-1', TURNO).subscribe();
    const req = httpMock.expectOne(`${URL}/appointment-schedules/t-1`);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual(TURNO);
  });

  it('eliminarTurnoProgramado hace DELETE sobre el turno', () => {
    service.eliminarTurnoProgramado('n-1', 't-1').subscribe();
    expect(httpMock.expectOne(`${URL}/appointment-schedules/t-1`).request.method).toBe('DELETE');
  });

  it('generar hace POST a generate', () => {
    service.generar('n-1').subscribe();
    expect(httpMock.expectOne(`${URL}/appointment-schedules/generate`).request.method).toBe('POST');
  });
});
