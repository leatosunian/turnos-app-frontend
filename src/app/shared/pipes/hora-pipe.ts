import { formatDate } from '@angular/common';
import { inject, LOCALE_ID, Pipe, PipeTransform } from '@angular/core';

/** Muestra la hora en formato de 24 h con cero adelante: `09:30`. */
@Pipe({
  name: 'hora',
})
export class HoraPipe implements PipeTransform {
  private readonly locale = inject(LOCALE_ID);

  transform(value: Date | string | null | undefined): string {
    if (Number.isNaN(new Date(value ?? '').getTime())) return '';

    return formatDate(value!, 'HH:mm', this.locale);
  }
}
