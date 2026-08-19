import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { TripStore } from '../../../../core/services/trip.store';
import { Trip } from '../../../../core/models/trip.model';
import { TripDatePipe } from '../../../../shared/pipes/format.pipe';

function isoDay(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function overlaps(trip: Trip, iso: string): boolean {
  const start = trip.startDate?.slice(0, 10);
  if (!start) return false;
  const end = trip.endDate?.slice(0, 10) || start;
  return iso >= start && iso <= end;
}

@Component({
  selector: 'app-calendar-page',
  standalone: true,
  imports: [RouterLink, TripDatePipe, MatIconModule],
  templateUrl: './calendar.page.html',
  styleUrl: './calendar.page.scss',
})
export class CalendarPage {
  private readonly store = inject(TripStore);
  readonly trips = this.store.trips;

  readonly view = signal({
    year: new Date().getFullYear(),
    month: new Date().getMonth(),
  });
  readonly selectedIso = signal<string | null>(null);

  readonly monthLabel = computed(() => {
    const { year, month } = this.view();
    return new Date(year, month, 1).toLocaleDateString('en-IN', {
      month: 'long',
      year: 'numeric',
    });
  });

  readonly calendarDays = computed(() => {
    const { year, month } = this.view();
    const first = new Date(year, month, 1);
    const startPad = first.getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const trips = this.trips();

    const cells: { day: number | null; iso: string | null; trips: Trip[] }[] = [];
    for (let i = 0; i < startPad; i++) {
      cells.push({ day: null, iso: null, trips: [] });
    }
    for (let d = 1; d <= daysInMonth; d++) {
      const iso = isoDay(year, month, d);
      cells.push({
        day: d,
        iso,
        trips: trips.filter((t) => overlaps(t, iso)),
      });
    }
    return cells;
  });

  readonly listedTrips = computed(() => {
    const selected = this.selectedIso();
    const trips = this.trips();
    if (selected) {
      return trips.filter((t) => overlaps(t, selected));
    }
    const { year, month } = this.view();
    const monthStart = isoDay(year, month, 1);
    const monthEnd = isoDay(year, month, new Date(year, month + 1, 0).getDate());
    return trips.filter((t) => {
      const start = t.startDate?.slice(0, 10);
      if (!start) return false;
      const end = t.endDate?.slice(0, 10) || start;
      return start <= monthEnd && end >= monthStart;
    });
  });

  readonly listTitle = computed(() => {
    const selected = this.selectedIso();
    if (!selected) return `Trips in ${this.monthLabel()}`;
    const d = new Date(`${selected}T12:00:00`);
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
  });

  readonly todayIso = new Date().toISOString().slice(0, 10);

  prevMonth(): void {
    this.selectedIso.set(null);
    this.view.update(({ year, month }) =>
      month === 0 ? { year: year - 1, month: 11 } : { year, month: month - 1 },
    );
  }

  nextMonth(): void {
    this.selectedIso.set(null);
    this.view.update(({ year, month }) =>
      month === 11 ? { year: year + 1, month: 0 } : { year, month: month + 1 },
    );
  }

  selectDay(iso: string | null): void {
    if (!iso) return;
    this.selectedIso.update((current) => (current === iso ? null : iso));
  }
}
