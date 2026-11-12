import { NgTemplateOutlet, formatDate } from '@angular/common';
import { Component, DestroyRef, LOCALE_ID, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ApiError } from '../../../core/models/api-error';
import { RoleName, UserResponse } from '../../../core/models/usuario';
import { AdminUsuarioService } from '../../../core/services/admin-usuario-service';
import { AuthService } from '../../../core/services/auth-service';
import { Boton } from '../../../shared/components/boton/boton';
import { Interruptor } from '../../../shared/components/interruptor/interruptor';
import { Pastilla } from '../../../shared/components/pastilla/pastilla';

type Estado = 'cargando' | 'listo' | 'error';
type Filtro = 'TODOS' | RoleName | 'INACTIVOS';

const TAMANIO_PAGINA = 8;

const FILTROS: { valor: Filtro; texto: string }[] = [
  { valor: 'TODOS', texto: 'Todos' },
  { valor: 'OWNER', texto: 'OWNER' },
  { valor: 'EMPLOYEE', texto: 'EMPLOYEE' },
  { valor: 'CLIENT', texto: 'CLIENT' },
  { valor: 'ADMIN', texto: 'ADMIN' },
  { valor: 'INACTIVOS', texto: 'Inactivos' },
];

const ROLES: { rol: RoleName; detalle: string }[] = [
  { rol: 'OWNER', detalle: 'Dueño de negocio' },
  { rol: 'EMPLOYEE', detalle: 'Profesional' },
  { rol: 'CLIENT', detalle: 'Reserva turnos' },
  { rol: 'ADMIN', detalle: 'Plataforma' },
];

/** Sin tildes ni mayúsculas, para que "lucia" encuentre a "Lucía". */
function normalizar(texto: string): string {
  return texto.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
}

/** 1 2 3 … 488: la primera, la última y las vecinas de la actual. */
function numerosDePagina(actual: number, total: number): (number | null)[] {
  const numeros: (number | null)[] = [];
  for (let i = 0; i < total; i++) {
    if (i === 0 || i === total - 1 || Math.abs(i - actual) <= 1) {
      numeros.push(i);
    } else if (numeros[numeros.length - 1] !== null) {
      numeros.push(null);
    }
  }
  return numeros;
}

@Component({
  imports: [Boton, Interruptor, NgTemplateOutlet, Pastilla],
  selector: 'app-admin-usuarios-page',
  styleUrl: './admin-usuarios-page.css',
  templateUrl: './admin-usuarios-page.html',
  host: { '(document:keydown.escape)': 'cerrarPanelCelular()' },
})
export class AdminUsuariosPage implements OnInit {
  private readonly usuariosApi = inject(AdminUsuarioService);
  private readonly auth = inject(AuthService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly locale = inject(LOCALE_ID);

  protected readonly filtros = FILTROS;
  protected readonly roles = ROLES;

  protected readonly estado = signal<Estado>('cargando');
  protected readonly errorCarga = signal('');
  protected readonly usuarios = signal<UserResponse[]>([]);

  protected readonly busqueda = signal('');
  protected readonly filtro = signal<Filtro>('TODOS');
  protected readonly pagina = signal(0);

  protected readonly seleccionadoId = signal<string | null>(null);
  /** En el celular el panel se abre como diálogo al tocar un usuario. */
  protected readonly panelCelularAbierto = signal(false);
  protected readonly rolesElegidos = signal<ReadonlySet<RoleName>>(new Set());
  protected readonly guardandoRoles = signal(false);
  protected readonly errorRoles = signal('');
  /** Ids de los usuarios cuyo estado se está cambiando. */
  protected readonly cambiandoActivo = signal<ReadonlySet<string>>(new Set());
  protected readonly errorActivo = signal('');

  private readonly miId = computed(() => this.auth.usuario()?.id ?? null);

  /** "3.902 usuarios · 412 nuevos en noviembre". */
  protected readonly resumen = computed(() => {
    const ahora = new Date();
    const nuevos = this.usuarios().filter((u) => {
      const alta = new Date(u.createdAt);
      return alta.getFullYear() === ahora.getFullYear() && alta.getMonth() === ahora.getMonth();
    }).length;
    const mes = formatDate(ahora, 'MMMM', this.locale);
    const total = this.usuarios().length;
    return {
      total: `${total.toLocaleString(this.locale)} ${total === 1 ? 'usuario' : 'usuarios'}`,
      nuevos: `${nuevos.toLocaleString(this.locale)} ${nuevos === 1 ? 'nuevo' : 'nuevos'} en ${mes}`,
    };
  });

  /** Los más nuevos primero, como en la maqueta. */
  private readonly filtrados = computed(() => {
    const texto = normalizar(this.busqueda());
    const filtro = this.filtro();
    return this.usuarios()
      .filter((u) => {
        if (filtro === 'INACTIVOS' && u.active) return false;
        if (filtro !== 'TODOS' && filtro !== 'INACTIVOS' && !u.roles.includes(filtro)) {
          return false;
        }
        return !texto || normalizar(`${u.name} ${u.email}`).includes(texto);
      })
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  });

  protected readonly totalFiltrados = computed(() => this.filtrados().length);
  protected readonly totalPaginas = computed(() =>
    Math.max(1, Math.ceil(this.totalFiltrados() / TAMANIO_PAGINA)),
  );
  protected readonly visibles = computed(() => {
    const inicio = this.pagina() * TAMANIO_PAGINA;
    return this.filtrados().slice(inicio, inicio + TAMANIO_PAGINA);
  });
  /** "1–8 de 3.902". */
  protected readonly rango = computed(() => {
    const total = this.totalFiltrados();
    if (!total) return '0 de 0';
    const desde = this.pagina() * TAMANIO_PAGINA + 1;
    const hasta = desde + this.visibles().length - 1;
    return `${desde}–${hasta} de ${total.toLocaleString(this.locale)}`;
  });
  protected readonly paginas = computed(() => numerosDePagina(this.pagina(), this.totalPaginas()));

  protected readonly seleccionado = computed(
    () => this.usuarios().find((u) => u.id === this.seleccionadoId()) ?? null,
  );
  protected readonly esMiCuenta = computed(
    () => !!this.seleccionado() && this.seleccionado()!.id === this.miId(),
  );
  protected readonly rolesCambiaron = computed(() => {
    const usuario = this.seleccionado();
    if (!usuario) return false;
    const elegidos = this.rolesElegidos();
    return (
      usuario.roles.length !== elegidos.size || usuario.roles.some((rol) => !elegidos.has(rol))
    );
  });

  ngOnInit(): void {
    this.cargar();
  }

  protected cargar(): void {
    this.estado.set('cargando');
    this.usuariosApi
      .listar()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (usuarios) => {
          this.usuarios.set(usuarios);
          this.estado.set('listo');
        },
        error: (error: ApiError) => {
          this.errorCarga.set(error.message);
          this.estado.set('error');
        },
      });
  }

  protected buscar(texto: string): void {
    this.busqueda.set(texto);
    this.pagina.set(0);
  }

  protected elegirFiltro(filtro: Filtro): void {
    this.filtro.set(filtro);
    this.pagina.set(0);
  }

  protected irAPagina(numero: number): void {
    this.pagina.set(Math.min(Math.max(numero, 0), this.totalPaginas() - 1));
  }

  protected seleccionar(usuario: UserResponse): void {
    this.seleccionadoId.set(usuario.id);
    this.rolesElegidos.set(new Set(usuario.roles));
    this.errorRoles.set('');
    this.panelCelularAbierto.set(true);
  }

  protected cerrarPanelCelular(): void {
    if (!this.guardandoRoles()) this.panelCelularAbierto.set(false);
  }

  protected alternarRol(rol: RoleName): void {
    this.rolesElegidos.update((elegidos) => {
      const nuevos = new Set(elegidos);
      if (nuevos.has(rol)) {
        nuevos.delete(rol);
      } else {
        nuevos.add(rol);
      }
      return nuevos;
    });
  }

  /** Uno mismo no se puede sacar ADMIN: se quedaría afuera del panel. */
  protected rolBloqueado(rol: RoleName): boolean {
    return rol === 'ADMIN' && this.esMiCuenta();
  }

  protected guardarRoles(): void {
    const usuario = this.seleccionado();
    if (!usuario || !this.rolesElegidos().size || this.guardandoRoles()) return;

    // En el orden de la lista, no en el que se fueron tocando.
    const roles = ROLES.map((r) => r.rol).filter((rol) => this.rolesElegidos().has(rol));
    this.guardandoRoles.set(true);
    this.errorRoles.set('');
    this.usuariosApi
      .actualizarRoles(usuario.id, roles)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (actualizado) => {
          this.reemplazar(actualizado);
          this.rolesElegidos.set(new Set(actualizado.roles));
          this.guardandoRoles.set(false);
        },
        error: (error: ApiError) => {
          this.guardandoRoles.set(false);
          this.errorRoles.set(error.message);
        },
      });
  }

  /** Uno mismo no se puede desactivar. */
  protected puedeCambiarActivo(usuario: UserResponse): boolean {
    return usuario.id !== this.miId() && !this.cambiandoActivo().has(usuario.id);
  }

  /**
   * Cambia el estado en la lista enseguida y lo confirma con el back. Si falla, vuelve atrás y
   * muestra el motivo (por ejemplo, 409 por turnos pendientes).
   */
  protected cambiarActivo(usuario: UserResponse, activo: boolean): void {
    if (usuario.active === activo || !this.puedeCambiarActivo(usuario)) return;

    this.errorActivo.set('');
    this.reemplazar({ ...usuario, active: activo });
    this.cambiandoActivo.update((ids) => new Set(ids).add(usuario.id));

    this.usuariosApi
      .alternarActivo(usuario.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (actualizado) => {
          this.reemplazar(actualizado);
          this.terminarCambioActivo(usuario.id);
        },
        error: (error: ApiError) => {
          this.reemplazar(usuario);
          this.terminarCambioActivo(usuario.id);
          this.errorActivo.set(`${usuario.name}: ${error.message}`);
        },
      });
  }

  protected fechaAlta(usuario: UserResponse): string {
    return formatDate(usuario.createdAt, 'dd/MM', this.locale);
  }

  protected fechaAltaCompleta(usuario: UserResponse): string {
    return formatDate(usuario.createdAt, 'dd/MM/yyyy', this.locale);
  }

  private terminarCambioActivo(id: string): void {
    this.cambiandoActivo.update((ids) => {
      const nuevos = new Set(ids);
      nuevos.delete(id);
      return nuevos;
    });
  }

  private reemplazar(usuario: UserResponse): void {
    this.usuarios.update((lista) => lista.map((u) => (u.id === usuario.id ? usuario : u)));
  }
}
