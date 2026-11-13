import { NgTemplateOutlet } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import {
  AbstractControl,
  NonNullableFormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import {
  Observable,
  catchError,
  concat,
  forkJoin,
  last,
  map,
  of,
  switchMap,
  tap,
  throwError,
} from 'rxjs';
import { ApiError } from '../../../core/models/api-error';
import {
  BusinessRequest,
  BusinessResponse,
  BusinessTypeResponse,
} from '../../../core/models/negocio';
import { ServResponse } from '../../../core/models/servicio';
import { NegocioService } from '../../../core/services/negocio-service';
import { RubroService } from '../../../core/services/rubro-service';
import { ServicioService } from '../../../core/services/servicio-service';
import { MenuMasEstado } from '../../../layouts/private-layout/menu-mas/menu-mas-estado';
import { Boton } from '../../../shared/components/boton/boton';
import { Campo } from '../../../shared/components/campo/campo';
import { Pastilla } from '../../../shared/components/pastilla/pastilla';
import { MontoPipe } from '../../../shared/pipes/monto-pipe';
import { emailValido, obligatorio } from '../../../shared/validadores/validadores';

type Estado = 'cargando' | 'crear' | 'editar' | 'error';

// Rutas del front que no pueden ser el slug de un negocio, porque '/:slug' las taparía.
const SLUGS_RESERVADOS = ['panel', 'admin', 'ingresar', 'reserva', 'mis-turnos'];
const FORMATO_SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const FORMATO_TELEFONO = /^[0-9]{7,15}$/;
export const MAX_DESCRIPCION = 300;
// El back necesita saber cuántos días de turnos generar. Después se ajusta en Horarios.
export const DIAS_A_GENERAR = 30;
const RUBROS_VISIBLES = 5;
// Cuántos rubros puede tener un negocio. Más que eso deja de describir qué hace.
export const MAX_RUBROS = 3;
// La vista previa muestra los primeros, como la página pública.
const SERVICIOS_EN_VISTA_PREVIA = 2;

/** Se puede escribir "11 4555 0182": los espacios se sacan antes de mandarlo. */
function sinEspacios(valor: string): string {
  return valor.replace(/\s/g, '');
}

function slugReservado(control: AbstractControl): ValidationErrors | null {
  return SLUGS_RESERVADOS.includes(control.value) ? { reservado: true } : null;
}

function telefonoValido(control: AbstractControl): ValidationErrors | null {
  const telefono = sinEspacios(control.value);
  return !telefono || FORMATO_TELEFONO.test(telefono) ? null : { telefono: true };
}

function valoresDe(negocio: BusinessResponse) {
  return {
    nombre: negocio.name,
    slug: negocio.slug,
    email: negocio.email,
    telefono: negocio.phone,
    descripcion: negocio.description ?? '',
  };
}

function iniciales(nombre: string): string {
  return nombre
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((palabra) => palabra[0] ?? '')
    .join('')
    .toUpperCase();
}

@Component({
  imports: [Boton, Campo, MontoPipe, NgTemplateOutlet, Pastilla, ReactiveFormsModule, RouterLink],
  selector: 'app-mi-negocio-page',
  styleUrl: './mi-negocio-page.css',
  templateUrl: './mi-negocio-page.html',
})
export class MiNegocioPage implements OnInit {
  private readonly negocios = inject(NegocioService);
  private readonly rubrosApi = inject(RubroService);
  private readonly serviciosApi = inject(ServicioService);
  private readonly menuMas = inject(MenuMasEstado);
  private readonly destroyRef = inject(DestroyRef);
  private readonly fb = inject(NonNullableFormBuilder);

  protected readonly maxDescripcion = MAX_DESCRIPCION;
  protected readonly maxRubros = MAX_RUBROS;
  protected readonly dominio = `${location.host}/`;

  protected readonly estado = signal<Estado>('cargando');
  protected readonly errorCarga = signal('');
  /** El negocio como está guardado en el back. */
  protected readonly negocio = signal<BusinessResponse | null>(null);
  /** Para la vista previa. null si todavía no llegaron o no se pudieron cargar. */
  protected readonly servicios = signal<ServResponse[] | null>(null);
  protected readonly rubros = signal<BusinessTypeResponse[]>([]);
  protected readonly rubrosElegidos = signal<ReadonlySet<string>>(new Set());
  protected readonly verTodosLosRubros = signal(false);

  protected readonly enviado = signal(false);
  protected readonly guardando = signal(false);
  protected readonly errorGuardar = signal<string | null>(null);
  protected readonly copiado = signal(false);

  protected readonly form = this.fb.group({
    nombre: ['', [obligatorio, Validators.maxLength(100)]],
    slug: [
      '',
      [
        Validators.required,
        Validators.maxLength(100),
        Validators.pattern(FORMATO_SLUG),
        slugReservado,
      ],
    ],
    email: ['', [obligatorio, emailValido, Validators.maxLength(255)]],
    telefono: ['', [Validators.required, telefonoValido]],
    descripcion: ['', Validators.maxLength(MAX_DESCRIPCION)],
  });

  protected readonly mensajes = {
    nombre: {
      required: 'Ingresá el nombre del negocio.',
      maxlength: 'Puede tener hasta 100 caracteres.',
    },
    slug: {
      required: 'Elegí la dirección de tu página.',
      pattern: 'Usá solo minúsculas, números y guiones, sin espacios ni tildes.',
      reservado: 'Esa dirección está reservada, elegí otra.',
      maxlength: 'Puede tener hasta 100 caracteres.',
    },
    email: {
      required: 'Ingresá un email de contacto.',
      email: 'Revisá el email, no parece válido.',
      maxlength: 'Puede tener hasta 255 caracteres.',
    },
    telefono: {
      required: 'Ingresá un teléfono.',
      telefono: 'Usá solo números, entre 7 y 15, sin el +.',
    },
    descripcion: { maxlength: `Puede tener hasta ${MAX_DESCRIPCION} caracteres.` },
  };

  private readonly valores = toSignal(
    this.form.valueChanges.pipe(map(() => this.form.getRawValue())),
    { initialValue: this.form.getRawValue() },
  );

  private readonly camposCambiaron = computed(() => {
    const negocio = this.negocio();
    if (!negocio) return false;
    const actual = this.valores();
    const original = valoresDe(negocio);
    return (
      actual.nombre !== original.nombre ||
      actual.slug !== original.slug ||
      actual.email !== original.email ||
      sinEspacios(actual.telefono) !== original.telefono ||
      actual.descripcion !== original.descripcion
    );
  });

  private readonly rubrosCambiaron = computed(() => {
    const originales = this.negocio()?.businessTypes.map((rubro) => rubro.id) ?? [];
    const elegidos = this.rubrosElegidos();
    return originales.length !== elegidos.size || originales.some((id) => !elegidos.has(id));
  });

  /** La barra de guardar sólo aparece cuando hay algo distinto de lo guardado. */
  protected readonly hayCambios = computed(
    () => this.estado() === 'editar' && (this.camposCambiaron() || this.rubrosCambiaron()),
  );

  protected readonly largoDescripcion = computed(() => this.valores().descripcion.length);

  // Los rubros que ya tenía van primero. Se ordena con lo guardado para que no salten al tocarlos.
  private readonly rubrosOrdenados = computed(() => {
    const guardados = new Set(this.negocio()?.businessTypes.map((rubro) => rubro.id));
    return [...this.rubros()].sort(
      (a, b) =>
        Number(guardados.has(b.id)) - Number(guardados.has(a.id)) ||
        a.name.localeCompare(b.name, 'es'),
    );
  });

  protected readonly rubrosVisibles = computed(() => {
    const todos = this.rubrosOrdenados();
    if (this.verTodosLosRubros()) return todos;
    const cantidad = Math.max(RUBROS_VISIBLES, this.negocio()?.businessTypes.length ?? 0);
    return todos.slice(0, cantidad);
  });

  /** Con el tope alcanzado sólo se pueden destildar rubros, no sumar otros. */
  protected readonly topeDeRubros = computed(() => this.rubrosElegidos().size >= MAX_RUBROS);

  protected readonly rubrosOcultos = computed(
    () => this.rubrosOrdenados().length - this.rubrosVisibles().length,
  );

  /** Lo que ve el cliente en la página pública, con lo que se está escribiendo. */
  protected readonly vistaPrevia = computed(() => {
    const { nombre, descripcion } = this.valores();
    const elegidos = this.rubrosElegidos();
    const nombres = new Map(
      [...(this.negocio()?.businessTypes ?? []), ...this.rubros()].map((r) => [r.id, r.name]),
    );
    return {
      nombre: nombre.trim() || 'Tu negocio',
      iniciales: iniciales(nombre) || 'TN',
      rubros: [...elegidos]
        .map((id) => nombres.get(id))
        .filter(Boolean)
        .join(' · '),
      descripcion: descripcion.trim(),
    };
  });

  protected readonly serviciosVisibles = computed(
    () => this.servicios()?.slice(0, SERVICIOS_EN_VISTA_PREVIA) ?? [],
  );
  protected readonly serviciosOcultos = computed(
    () => (this.servicios()?.length ?? 0) - this.serviciosVisibles().length,
  );

  /** Link de la página pública, con el slug guardado (el que se está editando todavía no existe). */
  protected readonly linkPublico = computed(() => {
    const negocio = this.negocio();
    return negocio ? `${location.origin}/${negocio.slug}` : null;
  });

  ngOnInit(): void {
    this.cargar();
  }

  protected cargar(): void {
    this.estado.set('cargando');
    forkJoin({
      // Si todavía no creó su negocio, el back responde 404 y se muestra el formulario vacío.
      negocio: this.negocios
        .miNegocio()
        .pipe(
          catchError((error: ApiError) =>
            error.status === 404 ? of(null) : throwError(() => error),
          ),
        ),
      rubros: this.rubrosApi.listar(),
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ negocio, rubros }) => {
          this.rubros.set(rubros);
          if (negocio) {
            this.aplicar(negocio);
            this.estado.set('editar');
            this.cargarServicios(negocio.id);
          } else {
            this.estado.set('crear');
          }
        },
        error: (error: ApiError) => {
          this.errorCarga.set(error.message);
          this.estado.set('error');
        },
      });
  }

  /** Si falla, la vista previa se muestra sin servicios: no vale la pena trabar la pantalla. */
  private cargarServicios(businessId: string): void {
    this.serviciosApi
      .listar(businessId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (servicios) => this.servicios.set(servicios),
        error: () => this.servicios.set(null),
      });
  }

  protected alternarRubro(id: string): void {
    this.rubrosElegidos.update((elegidos) => {
      const nuevos = new Set(elegidos);
      if (nuevos.has(id)) {
        nuevos.delete(id);
      } else if (nuevos.size < MAX_RUBROS) {
        nuevos.add(id);
      }
      return nuevos;
    });
  }

  protected descartar(): void {
    const negocio = this.negocio();
    if (negocio) this.aplicar(negocio);
    this.errorGuardar.set(null);
  }

  protected guardar(): void {
    this.enviado.set(true);
    this.errorGuardar.set(null);
    if (this.form.invalid || this.guardando()) return;
    // Un negocio creado antes del tope puede tener más: tiene que sacar alguno para guardar.
    if (this.rubrosElegidos().size > MAX_RUBROS) {
      this.errorGuardar.set(`Elegí hasta ${MAX_RUBROS} rubros.`);
      return;
    }

    this.guardando.set(true);
    const pedido = this.estado() === 'crear' ? this.crear() : this.actualizar();
    pedido.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (negocio) => {
        this.guardando.set(false);
        this.aplicar(negocio);
      },
      error: (error: ApiError) => {
        this.guardando.set(false);
        // Los errores de validación vienen como "slug: mensaje, phone: mensaje".
        this.errorGuardar.set(error.message.replace(/(^|, )\w+: /g, '$1'));
      },
    });
  }

  protected copiarLink(): void {
    const link = this.linkPublico();
    if (!link) return;
    navigator.clipboard
      ?.writeText(link)
      .then(() => {
        this.copiado.set(true);
        setTimeout(() => this.copiado.set(false), 2000);
      })
      .catch(() => {});
  }

  /** Link "‹ Más" del celular: vuelve al menú de donde se entró. */
  protected volverAMas(): void {
    this.menuMas.abrir();
  }

  protected error(control: AbstractControl, mensajes: Record<string, string>): string | null {
    if (!control.errors || !(control.touched || this.enviado())) return null;
    const clave = Object.keys(mensajes).find((k) => control.hasError(k));
    return clave ? mensajes[clave] : null;
  }

  private crear(): Observable<BusinessResponse> {
    const datos: BusinessRequest = { ...this.datosDelForm(), scheduleDaysToCreate: DIAS_A_GENERAR };
    return this.negocios.crear(datos).pipe(
      tap((negocio) => {
        this.registrar(negocio);
        this.servicios.set([]);
      }),
      switchMap((negocio) => this.sincronizarRubros(negocio)),
    );
  }

  private actualizar(): Observable<BusinessResponse> {
    const negocio = this.negocio()!;
    if (!this.camposCambiaron()) {
      return this.sincronizarRubros(negocio);
    }
    // El PUT reemplaza todo: se mandan igual los datos de la agenda que esta pantalla no edita.
    const datos: BusinessRequest = {
      ...this.datosDelForm(),
      automaticSchedule: negocio.automaticSchedule,
      scheduleEnd: negocio.scheduleEnd,
      scheduleDaysToCreate: negocio.scheduleDaysToCreate,
      scheduleAnticipation: negocio.scheduleAnticipation,
    };
    return this.negocios.actualizar(negocio.id, datos).pipe(
      tap((actualizado) => this.registrar(actualizado)),
      switchMap((actualizado) => this.sincronizarRubros(actualizado)),
    );
  }

  /** Asigna y quita los rubros que cambiaron, de a uno, porque el back no tiene un endpoint para todos. */
  private sincronizarRubros(negocio: BusinessResponse): Observable<BusinessResponse> {
    const guardados = new Set(negocio.businessTypes.map((rubro) => rubro.id));
    const elegidos = this.rubrosElegidos();
    const pedidos = [
      ...[...elegidos]
        .filter((id) => !guardados.has(id))
        .map((id) => this.negocios.asignarRubro(negocio.id, id)),
      ...[...guardados]
        .filter((id) => !elegidos.has(id))
        .map((id) => this.negocios.quitarRubro(negocio.id, id)),
    ];
    if (!pedidos.length) return of(negocio);
    return concat(...pedidos).pipe(
      tap((actualizado) => this.registrar(actualizado)),
      last(),
    );
  }

  /**
   * Guarda lo que ya confirmó el back sin tocar el formulario. Si un paso falla a mitad de camino,
   * la barra sigue mostrando sólo lo que falta y al reintentar no se vuelve a crear el negocio.
   */
  private registrar(negocio: BusinessResponse): void {
    this.negocio.set(negocio);
    this.estado.set('editar');
  }

  /** Deja el formulario y los rubros como están guardados. */
  private aplicar(negocio: BusinessResponse): void {
    this.registrar(negocio);
    this.form.reset(valoresDe(negocio));
    this.rubrosElegidos.set(new Set(negocio.businessTypes.map((rubro) => rubro.id)));
    this.enviado.set(false);
  }

  private datosDelForm(): BusinessRequest {
    const { nombre, slug, email, telefono, descripcion } = this.form.getRawValue();
    return {
      name: nombre.trim(),
      slug,
      email: email.trim(),
      phone: sinEspacios(telefono),
      description: descripcion.trim(),
    };
  }
}
