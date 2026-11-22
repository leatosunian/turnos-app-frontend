import { formatDate } from '@angular/common';
import { inject, LOCALE_ID, Pipe, PipeTransform } from '@angular/core';

/**
 * Muestra una fecha en palabras (`Martes 28 de octubre`) o, con `fecha:'corta'`,
 * en su versión corta (`mar 28 oct`).
 */
@Pipe({
  name: 'fecha',
})
export class FechaPipe implements PipeTransform {
  private readonly locale = inject(LOCALE_ID);

  transform(value: Date | string | null | undefined, formato: 'larga' | 'corta' = 'larga'): string {
    if (Number.isNaN(new Date(value ?? '').getTime())) return '';

    if (formato === 'corta') return formatDate(value!, 'EEE d MMM', this.locale);

    const larga = formatDate(value!, "EEEE d 'de' MMMM", this.locale);
    return larga.charAt(0).toUpperCase() + larga.slice(1);
  }
}
