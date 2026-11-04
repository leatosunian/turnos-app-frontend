import { Pipe, PipeTransform } from '@angular/core';

/** Muestra una duración recibida en minutos: `45 min`, `1 h`, `1 h 30 min`. */
@Pipe({
  name: 'duracion',
})
export class DuracionPipe implements PipeTransform {
  transform(value: number | null | undefined): string {
    if (value === null || value === undefined || !Number.isFinite(value) || value < 0) return '';

    const total = Math.round(value);
    const horas = Math.floor(total / 60);
    const minutos = total % 60;

    if (horas === 0) return `${minutos} min`;
    return minutos === 0 ? `${horas} h` : `${horas} h ${minutos} min`;
  }
}
