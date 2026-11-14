import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, catchError, of, switchMap, tap, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthResponse, LoginRequest, RegisterRequest } from '../models/auth';
import { RoleName, UserResponse } from '../models/usuario';

const CLAVE_TOKEN = 'token';

// Si un usuario tiene más de un rol, va a la ruta del rol más alto.
const RUTA_POR_ROL: [RoleName, string][] = [
  ['ADMIN', '/admin'],
  ['OWNER', '/panel'],
  ['EMPLOYEE', '/panel/actividad'],
  ['CLIENT', '/mis-turnos'],
];

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly url = `${environment.apiUrl}/auth`;

  private readonly usuarioActual = signal<UserResponse | null>(null);
  // Copia en memoria por si localStorage no está disponible (por ejemplo, en modo privado).
  private tokenActual: string | null = leerToken();

  /** Usuario logueado, o null si no hay sesión. */
  readonly usuario = this.usuarioActual.asReadonly();
  readonly logueado = computed(() => this.usuarioActual() !== null);

  get token(): string | null {
    return this.tokenActual;
  }

  login(datos: LoginRequest): Observable<UserResponse> {
    return this.http.post<AuthResponse>(`${this.url}/login`, datos).pipe(this.iniciarSesion());
  }

  /** Registra un dueño de negocio (OWNER) y deja la sesión iniciada. */
  registrar(datos: RegisterRequest): Observable<UserResponse> {
    return this.http.post<AuthResponse>(`${this.url}/register`, datos).pipe(this.iniciarSesion());
  }

  /** Registra un cliente (CLIENT) y deja la sesión iniciada. */
  registrarCliente(datos: RegisterRequest): Observable<UserResponse> {
    return this.http
      .post<AuthResponse>(`${this.url}/register/client`, datos)
      .pipe(this.iniciarSesion());
  }

  /** Pide el usuario actual al back. El JWT no trae los roles, así que siempre hay que llamarlo. */
  cargarUsuario(): Observable<UserResponse> {
    return this.http
      .get<UserResponse>(`${this.url}/me`)
      .pipe(tap((usuario) => this.usuarioActual.set(usuario)));
  }

  /**
   * Recupera la sesión al recargar la página. Si el token venció, lo descarta.
   * Nunca falla: si no hay sesión, devuelve null.
   */
  restaurarSesion(): Observable<UserResponse | null> {
    if (!this.token) {
      return of(null);
    }
    return this.cargarUsuario().pipe(
      catchError((error: { status?: number }) => {
        // Con un token vencido, inválido o de una cuenta desactivada el back responde 401. El 403
        // se trata igual por las dudas: /auth/me solo pide estar logueado, así que un 403 ahí
        // también significa que la sesión no sirve.
        if (error.status === 401 || error.status === 403) {
          this.limpiarSesion();
        }
        return of(null);
      }),
    );
  }

  // Borra el token y el usuario y lleva a otra pantalla. destino: a donde ir despues.
  // Por defecto es el home, que es lo que se espera cuando la persona toca "Cerrar sesion" en el
  // menu. El errorInterceptor pasa /ingresar porque ahi la sesion se corto sola (token vencido) y
  // lo logico es mandarla directo a loguearse de nuevo
  cerrarSesion(destino = '/'): void {
    this.limpiarSesion();
    this.router.navigateByUrl(destino);
  }

  tieneRol(roles: RoleName[]): boolean {
    const usuario = this.usuarioActual();
    return !!usuario && usuario.roles.some((rol) => roles.includes(rol));
  }

  /** Ruta a la que va el usuario según su rol. */
  rutaInicial(): string {
    const roles = this.usuarioActual()?.roles ?? [];
    return RUTA_POR_ROL.find(([rol]) => roles.includes(rol))?.[1] ?? '/';
  }

  /** Para usar después del login o el registro. */
  redirigirSegunRol(): Promise<boolean> {
    return this.router.navigateByUrl(this.rutaInicial());
  }

  private iniciarSesion() {
    return (respuesta$: Observable<AuthResponse>) =>
      respuesta$.pipe(
        tap(({ token }) => this.guardarToken(token)),
        switchMap(() => this.cargarUsuario()),
        catchError((error) => {
          this.limpiarSesion();
          return throwError(() => error);
        }),
      );
  }

  private guardarToken(token: string): void {
    this.tokenActual = token;
    try {
      localStorage.setItem(CLAVE_TOKEN, token);
    } catch {
      // Sin localStorage la sesión no sobrevive a una recarga, pero funciona igual.
    }
  }

  private limpiarSesion(): void {
    this.tokenActual = null;
    try {
      localStorage.removeItem(CLAVE_TOKEN);
    } catch {
      // Nada que limpiar.
    }
    this.usuarioActual.set(null);
  }
}

function leerToken(): string | null {
  try {
    return localStorage.getItem(CLAVE_TOKEN);
  } catch {
    return null;
  }
}
