import { Pipe, PipeTransform } from '@angular/core';

@Pipe({ name: 'inr', standalone: true })
export class InrCurrencyPipe implements PipeTransform {
  transform(value: number | null | undefined, currency = 'INR'): string {
    if (value == null) {
      return '—';
    }
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency,
      maximumFractionDigits: 0,
    }).format(value);
  }
}

@Pipe({ name: 'tripDate', standalone: true })
export class TripDatePipe implements PipeTransform {
  transform(start: string | null, end?: string | null): string {
    if (!start) {
      return 'Dates TBD';
    }
    const startDate = new Date(start);
    const fmt = (d: Date) =>
      d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
    if (!end) {
      return fmt(startDate);
    }
    return `${fmt(startDate)} → ${fmt(new Date(end))}`;
  }
}

@Pipe({ name: 'statusLabel', standalone: true })
export class StatusLabelPipe implements PipeTransform {
  transform(status: string): string {
    return status.replaceAll('_', ' ');
  }
}
