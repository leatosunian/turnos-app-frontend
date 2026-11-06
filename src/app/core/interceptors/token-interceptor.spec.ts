import { TestBed } from '@angular/core/testing';
import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { environment } from '../../../environments/environment';
import { AuthService } from '../services/auth-service';
import { tokenInterceptor } from './token-interceptor';

describe('tokenInterceptor', () => {
  let http: HttpClient;
  let httpMock: HttpTestingController;
  let token: string | null;

  beforeEach(() => {
    token = null;
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([tokenInterceptor])),
        provideHttpClientTesting(),
        {
          provide: AuthService,
          useValue: {
            get token() {
              return token;
            },
          },
        },
      ],
    });
    http = TestBed.inject(HttpClient);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('agrega el token a los pedidos al backend', () => {
    token = 'abc';
    http.get(`${environment.apiUrl}/auth/me`).subscribe();
    const req = httpMock.expectOne(`${environment.apiUrl}/auth/me`);

    expect(req.request.headers.get('Authorization')).toBe('Bearer abc');
    req.flush({});
  });

  it('no agrega nada si no hay sesión', () => {
    http.get(`${environment.apiUrl}/business-types`).subscribe();
    const req = httpMock.expectOne(`${environment.apiUrl}/business-types`);

    expect(req.request.headers.has('Authorization')).toBe(false);
    req.flush([]);
  });

  it('no manda el token a otros dominios', () => {
    token = 'abc';
    http.get('https://otro-sitio.com/datos').subscribe();
    const req = httpMock.expectOne('https://otro-sitio.com/datos');

    expect(req.request.headers.has('Authorization')).toBe(false);
    req.flush({});
  });
});
