import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { environment } from '../../../environments/environment';
import { RubroService } from './rubro-service';

describe('RubroService', () => {
  let service: RubroService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(RubroService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('listar pide los rubros activos', () => {
    service.listar().subscribe();

    const req = httpMock.expectOne(`${environment.apiUrl}/business-types`);
    expect(req.request.method).toBe('GET');
    req.flush([]);
  });
});
