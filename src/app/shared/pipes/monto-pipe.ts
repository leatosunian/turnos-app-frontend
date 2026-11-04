import { formatNumber } from '@angular/common';
import { inject, LOCALE_ID, Pipe, PipeTransform } from '@angular/core';

/** Muestra un monto con punto de miles y sin decimales: `$12.500`. */
@Pipe({
  name: 'monto',
})
export class MontoPipe implements PipeTransform {
  private readonly locale = inject(LOCALE_ID);

  transform(value: number | string | null | undefined): string {
    if (value === null || value === undefined || value === '') return '';

    const monto = Number(value);
    if (!Number.isFinite(monto)) return '';

    const signo = monto < 0 ? '-' : '';
    return `${signo}$${formatNumber(Math.abs(monto), this.locale, '1.0-0')}`;
  }
}
