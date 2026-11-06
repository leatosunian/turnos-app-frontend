import { DOCUMENT } from '@angular/common';
import {
  AfterViewInit,
  Component,
  DestroyRef,
  ElementRef,
  OnInit,
  computed,
  inject,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { ApiError } from '../../../core/models/api-error';
import { BusinessResponse } from '../../../core/models/negocio';
import { AuthService } from '../../../core/services/auth-service';
import { NegocioService } from '../../../core/services/negocio-service';

const ACCESOS: { ruta: string; titulo: string; detalle: string }[] = [
  { ruta: '/panel/turnos', titulo: 'Turnos', detalle: 'Lista completa, filtros y búsqueda' },
  {
    ruta: '/panel/servicios',
    titulo: 'Servicios y equipo',
    detalle: 'Precios, duración y profesionales',
  },
  {
    ruta: '/panel/horarios',
    titulo: 'Horarios y plantillas',
    detalle: 'Días de atención y agenda automática',
  },
  { ruta: '/panel/negocio', titulo: 'Mi negocio', detalle: 'Datos, link público y rubros' },
];

type EstadoNegocio =
  | { tipo: 'cargando' }
  | { tipo: 'listo'; negocio: BusinessResponse }
  | { tipo: 'sin-negocio' }
  | { tipo: 'error'; mensaje: string };

type EstadoCopia = 'nada' | 'copiado' | 'fallo';

const MENSAJES_COPIA: Record<EstadoCopia, string> = {
  nada: '',
  copiado: 'Link copiado.',
  fallo: 'No se pudo copiar. Mantené apretado el link para copiarlo a mano.',
};

/** Menú "Más" del panel en el celular: lo que no entra en la barra de abajo. */
@Component({
  imports: [RouterLink],
  selector: 'app-menu-mas',
  styleUrl: './menu-mas.css',
  templateUrl: './menu-mas.html',
})
export class MenuMas implements OnInit, AfterViewInit {
  private readonly auth = inject(AuthService);
  private readonly negocios = inject(NegocioService);
  private readonly origen = inject(DOCUMENT).location.origin;
  private readonly destroyRef = inject(DestroyRef);
  private readonly titulo = viewChild.required<ElementRef<HTMLElement>>('titulo');
  private timerCopia?: ReturnType<typeof setTimeout>;

  constructor() {
    this.destroyRef.onDestroy(() => clearTimeout(this.timerCopia));
  }

  /** Se emite al elegir un acceso, para que el layout cierre el menú. */
  readonly elegir = output<void>();

  protected readonly accesos = ACCESOS;
  // Un EMPLOYEE no puede entrar a estas pantallas ni pedir /businesses/mine.
  protected readonly esDueno = this.auth.tieneRol(['OWNER']);
  protected readonly estado = signal<EstadoNegocio>({ tipo: 'cargando' });
  protected readonly copia = signal<EstadoCopia>('nada');

  protected readonly negocio = computed(() => {
    const estado = this.estado();
    return estado.tipo === 'listo' ? estado.negocio : null;
  });
  protected readonly nombre = computed(
    () => this.negocio()?.name ?? this.auth.usuario()?.name ?? '',
  );
  protected readonly iniciales = computed(() => iniciales(this.nombre()));
  protected readonly link = computed(() => {
    const slug = this.negocio()?.slug;
    return slug ? `${this.origen}/${slug}` : '';
  });
  protected readonly errorMensaje = computed(() => {
    const estado = this.estado();
    return estado.tipo === 'error' ? estado.mensaje : '';
  });
  protected readonly mensajeCopia = computed(() => MENSAJES_COPIA[this.copia()]);
  /** El link sin el protocolo, como se muestra en pantalla. */
  protected readonly linkVisible = computed(() => this.link().replace(/^https?:\/\//, ''));

  ngOnInit(): void {
    if (this.esDueno) {
      this.cargarNegocio();
    }
  }

  ngAfterViewInit(): void {
    // Lleva el foco al menú para que el lector de pantalla anuncie que se abrió.
    this.titulo().nativeElement.focus();
  }

  protected cargarNegocio(): void {
    this.estado.set({ tipo: 'cargando' });
    this.negocios
      .miNegocio()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (negocio) => this.estado.set({ tipo: 'listo', negocio }),
        error: (error: ApiError) =>
          this.estado.set(
            error.status === 404
              ? { tipo: 'sin-negocio' }
              : { tipo: 'error', mensaje: error.message },
          ),
      });
  }

  protected async copiarLink(): Promise<void> {
    try {
      await navigator.clipboard.writeText(this.link());
      this.copia.set('copiado');
    } catch {
      // Sin permiso o fuera de https el navegador no deja copiar.
      this.copia.set('fallo');
    }
    clearTimeout(this.timerCopia);
    this.timerCopia = setTimeout(() => this.copia.set('nada'), 2500);
  }

  protected cerrarSesion(): void {
    this.auth.cerrarSesion();
  }
}

function iniciales(nombre: string): string {
  return nombre
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((palabra) => palabra[0].toUpperCase())
    .join('');
}
