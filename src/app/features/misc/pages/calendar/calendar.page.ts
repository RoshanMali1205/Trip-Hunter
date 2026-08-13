import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TripStore } from '../../../../core/services/trip.store';
import { TripDatePipe } from '../../../../shared/pipes/format.pipe';

@Component({
  selector: 'app-calendar-page',
  standalone: true,
  imports: [RouterLink, TripDatePipe],
  templateUrl: './calendar.page.html',
  styleUrl: './calendar.page.scss',
})
export class CalendarPage {
  private readonly store = inject(TripStore);
  readonly trips = this.store.trips;

  readonly monthLabel = computed(() => {
    const now = new Date();
    return now.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
  });

  readonly calendarDays = computed(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const first = new Date(year, month, 1);
    const startPad = first.getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const tripDates = new Set(
      this.trips()
        .filter((t) => t.startDate)
        .map((t) => t.startDate!.slice(0, 10)),
    );

    const cells: { day: number | null; iso: string | null; hasTrip: boolean }[] = [];
    for (let i = 0; i < startPad; i++) {
      cells.push({ day: null, iso: null, hasTrip: false });
    }
    for (let d = 1; d <= daysInMonth; d++) {
      const iso = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      cells.push({ day: d, iso, hasTrip: tripDates.has(iso) });
    }
    return cells;
  });

  readonly todayIso = new Date().toISOString().slice(0, 10);
}
