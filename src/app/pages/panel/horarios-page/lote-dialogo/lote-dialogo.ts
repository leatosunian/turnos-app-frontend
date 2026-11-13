import {
  Component,
  DestroyRef,
  OnInit,
  computed,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { catchError, concatMap, from, map, of } from 'rxjs';
import { AppointmentScheduleResponse, DayScheduleResponse } from '../../../../core/models/horario';
import { ServResponse } from '../../../../core/models/servicio';
import { UserResponse } from '../../../../core/models/usuario';
import { HorarioService } from '../../../../core/services/horario-service';
import { Boton } from '../../../../shared/components/boton/boton';
import { Campo } from '../../../../shared/components/campo/campo';
import { Dialogo } from '../../../../shared/components/dialogo/dialogo';
import { MontoPipe } from '../../../../shared/pipes/monto-pipe';
import {
  DIAS,
  DIA_POR_DEFECTO,
  INTERVALOS,
  ResultadoLote,
  aMinutos,
  armarLote,
  conHora,
  enumerar,
  horaCorta,
  horariosDelRango,
  opcionesDeHora,
  resumirHorarios,
} from '../horarios';

// Lo que le avisa a HorariosPage al terminar: los turnos que se guardaron, para sumarlos a la
// grilla sin volver a pedir la plantilla, y los numeros para el aviso
export interface FinDeLote {
  creados: AppointmentScheduleResponse[];
  resultado: ResultadoLote;
}

// Dialogo de Asignar en lote. Lo abre HorariosPage con el boton del encabezado de Horario de
// atencion. El dueño elige servicio, profesional, dias y un rango con su intervalo, ve en la
// vista previa que turnos se van a crear y cuales se saltean, y al confirmar se manda un POST
// por turno, uno atras del otro, porque el back no tiene un alta de a varios.
@Component({
  selector: 'app-lote-dialogo',
  imports: [Boton, Campo, Dialogo, MontoPipe, RouterLink],
  templateUrl: './lote-dialogo.html',
})
export class LoteDialogo implements OnInit {
  readonly businessId = input.required<string>();
  // los 7 dias ordenados de lunes a domingo: los cerrados no se pueden elegir
  readonly semana = input.required<DayScheduleResponse[]>();
  readonly servicios = input.required<ServResponse[]>();
  readonly equipo = input.required<UserResponse[]>();
  readonly plantilla = input.required<AppointmentScheduleResponse[]>();
  // el dia que estaba mirando el dueño, que arranca elegido
  readonly diaInicial = input(0);

  readonly terminado = output<FinDeLote>();
  readonly cancelado = output<void>();

  private readonly horarios = inject(HorarioService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly dias = DIAS;
  private readonly horas = opcionesDeHora();

  protected readonly servicioId = signal('');
  // vacio es "Sin asignar"
  protected readonly empleadoId = signal('');
  protected readonly elegidos = signal<number[]>([]);
  protected readonly desde = signal('');
  protected readonly hasta = signal('');
  protected readonly cada = signal(30);

  // Mientras se mandan los POST: cuantos van y cuantos son en total, para la barra de avance
  protected readonly avance = signal<{ hechos: number; total: number } | null>(null);
  protected readonly creando = computed(() => this.avance() !== null);

  protected readonly servicio = computed(
    () => this.servicios().find((s) => s.id === this.servicioId()) ?? null,
  );

  protected readonly horasDesde = computed(() => conHora(this.horas, this.desde()));
  protected readonly horasHasta = computed(() =>
    conHora(
      this.horas.filter((hora) => aMinutos(hora) > aMinutos(this.desde() || '00:00')),
      this.hasta(),
    ),
  );
  // Los intervalos de siempre mas lo que dura el servicio, que es el que se elige por defecto.
  // Por ejemplo con un servicio de 50 min queda 15, 20, 30, 45, 50, 60, 90 y 120
  protected readonly opcionesCada = computed(() => {
    const duracion = this.servicio()?.durationMinutes;
    const opciones = duracion ? [...new Set([...INTERVALOS, duracion])] : INTERVALOS;
    return [...opciones].sort((a, b) => a - b);
  });

  // Los horarios de inicio de un dia, que son los mismos para todos los dias elegidos
  protected readonly horariosPorDia = computed(() => {
    const servicio = this.servicio();
    if (!servicio || !this.desde() || !this.hasta()) return [];
    return horariosDelRango(this.desde(), this.hasta(), this.cada(), servicio.durationMinutes);
  });

  protected readonly lote = computed(() => {
    const servicio = this.servicio();
    if (!servicio) return { aCrear: [], choques: [], fueraDeHorario: [] };
    return armarLote(
      {
        dias: this.elegidos(),
        desde: this.desde(),
        hasta: this.hasta(),
        cada: this.cada(),
        duracion: servicio.durationMinutes,
        serviceId: servicio.id,
        employeeId: this.empleadoId() || null,
      },
      this.plantilla(),
      this.semana(),
    );
  });

  // La primera frase de la vista previa, por ejemplo "Se van a crear 12 turnos programados: 4
  // por día en lunes, martes y miércoles." Cuenta todos los propuestos, y los que se saltean
  // se avisan abajo, asi que el boton puede decir menos (Crear 10 turnos)
  protected readonly resumen = computed(() => {
    const porDia = this.horariosPorDia().length;
    const dias = [...this.elegidos()].sort((a, b) => a - b);
    const total = porDia * dias.length;
    const nombres = enumerar(dias.map((numero) => DIAS[numero].largo.toLowerCase()));
    // con un solo dia no hace falta el "por dia": queda "Se van a crear 4 turnos programados
    // el lunes."
    if (dias.length === 1) {
      return total === 1
        ? `Se va a crear 1 turno programado el ${nombres}.`
        : `Se van a crear ${total} turnos programados el ${nombres}.`;
    }
    return `Se van a crear ${total} turnos programados: ${porDia} por día en ${nombres}.`;
  });

  // Los avisos rojos de la vista previa, uno por cada motivo para saltear turnos. Por ejemplo
  // "2 chocan con otros turnos de Lucia Gomez y se van a saltear: mar 10:00 y mar 10:45."
  // Los choques pueden ser con turnos guardados o entre los mismos del lote (cada 30 con un
  // servicio de 45), por eso dice "otros turnos" y no "turnos que ya existen"
  protected readonly avisos = computed(() => {
    const { choques, fueraDeHorario } = this.lote();
    const avisos: string[] = [];
    if (choques.length) {
      const nombre = this.equipo().find((e) => e.id === this.empleadoId())?.name;
      const de = nombre ? `de ${nombre}` : 'sin profesional';
      avisos.push(
        choques.length === 1
          ? `1 choca con otro turno ${de} y se va a saltear: ${resumirHorarios(choques)}.`
          : `${choques.length} chocan con otros turnos ${de} y se van a saltear: ${resumirHorarios(choques)}.`,
      );
    }
    if (fueraDeHorario.length) {
      avisos.push(
        fueraDeHorario.length === 1
          ? `1 queda fuera del horario de su día y se va a saltear: ${resumirHorarios(fueraDeHorario)}.`
          : `${fueraDeHorario.length} quedan fuera del horario de su día y se van a saltear: ${resumirHorarios(fueraDeHorario)}.`,
      );
    }
    return avisos;
  });

  protected readonly hayDiasAbiertos = computed(() => this.semana().some((dia) => dia.enabled));

  // Por que no se puede confirmar todavia, o null si se puede
  protected readonly problema = computed(() => {
    const servicio = this.servicio();
    if (!servicio) return 'Elegí un servicio.';
    if (!this.elegidos().length) return 'Elegí al menos un día.';
    if (!this.horariosPorDia().length) {
      return `Entre ${this.desde()} y ${this.hasta()} no entra ningún turno de ${servicio.durationMinutes} min.`;
    }
    if (!this.lote().aCrear.length) return 'Todos los turnos se saltean, no queda nada para crear.';
    return null;
  });

  ngOnInit(): void {
    const servicio = this.servicios()[0];
    this.servicioId.set(servicio?.id ?? '');
    this.cada.set(servicio?.durationMinutes ?? DIA_POR_DEFECTO.intervalo);

    // arranca con el dia que estaba mirando si esta abierto, o si no con el primero abierto, y
    // con su horario como rango
    const abierto = this.semana()[this.diaInicial()]?.enabled
      ? this.diaInicial()
      : this.semana().findIndex((dia) => dia.enabled);
    const dia = abierto >= 0 ? this.semana()[abierto] : null;
    if (abierto >= 0) this.elegidos.set([abierto]);
    this.desde.set(dia?.dayStart ? horaCorta(dia.dayStart) : DIA_POR_DEFECTO.inicio);
    this.hasta.set(dia?.dayEnd ? horaCorta(dia.dayEnd) : DIA_POR_DEFECTO.fin);
  }

  // Al cambiar el servicio, el intervalo pasa a ser lo que dura, que es lo mas comun: turnos
  // uno pegado al otro. Despues se puede cambiar para dejar margen entre turnos
  protected cambiarServicio(id: string): void {
    this.servicioId.set(id);
    const duracion = this.servicio()?.durationMinutes;
    if (duracion) this.cada.set(duracion);
  }

  protected cambiarDesde(hora: string): void {
    this.desde.set(hora);
    // igual que en el encabezado del dia: si el inicio pasa al fin, corremos el fin una hora
    if (aMinutos(this.hasta()) <= aMinutos(hora)) {
      this.hasta.set(this.horas[Math.min(this.horas.indexOf(hora) + 4, this.horas.length - 1)]);
    }
  }

  protected alternarDia(numero: number): void {
    if (!this.semana()[numero]?.enabled || this.creando()) return;
    this.elegidos.update((dias) =>
      dias.includes(numero) ? dias.filter((d) => d !== numero) : [...dias, numero],
    );
  }

  protected crear(): void {
    if (this.problema() || this.creando()) return;
    const { aCrear, choques, fueraDeHorario } = this.lote();
    const creados: AppointmentScheduleResponse[] = [];
    let fallidos = 0;

    this.avance.set({ hechos: 0, total: aCrear.length });
    from(aCrear)
      .pipe(
        // de a uno: concatMap espera que vuelva cada POST antes de mandar el siguiente. En
        // paralelo el back regeneraria la agenda varias veces a la vez
        concatMap((pedido) =>
          this.horarios.crearTurnoProgramado(this.businessId(), pedido).pipe(
            map((creado): AppointmentScheduleResponse | null => creado),
            // si uno falla seguimos con los demas y al final se cuenta
            catchError(() => of(null)),
          ),
        ),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (creado) => {
          if (creado) creados.push(creado);
          else fallidos++;
          this.avance.update((a) => a && { ...a, hechos: a.hechos + 1 });
        },
        complete: () =>
          this.terminado.emit({
            creados,
            resultado: {
              creados: creados.length,
              choques: choques.length,
              fueraDeHorario: fueraDeHorario.length,
              fallidos,
            },
          }),
      });
  }

  // Ancho de la barra de avance, en porcentaje. Por ejemplo 6 de 10 da 60
  protected porcentaje(a: { hechos: number; total: number }): number {
    return a.total ? Math.round((a.hechos / a.total) * 100) : 0;
  }
}
