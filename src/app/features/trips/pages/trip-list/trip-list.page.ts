import { DatePipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { TripStore } from '../../../../core/services/trip.store';
import { StatusLabelPipe } from '../../../../shared/pipes/format.pipe';

@Component({
  selector: 'app-trip-list-page',
  standalone: true,
  imports: [RouterLink, FormsModule, DatePipe, StatusLabelPipe],
  templateUrl: './trip-list.page.html',
  styleUrl: './trip-list.page.scss',
})
export class TripListPage {
  private readonly store = inject(TripStore);

  readonly search = signal('');
  readonly filter = signal<'all' | 'upcoming' | 'planning' | 'completed' | 'mine'>('all');

  readonly trips = computed(() => {
    let list = [...this.store.trips()];
    const q = this.search().trim().toLowerCase();
    const filter = this.filter();

    if (q) {
      list = list.filter(
        (t) =>
          t.title.toLowerCase().includes(q) ||
          t.destination.toLowerCase().includes(q) ||
          t.origin.toLowerCase().includes(q),
      );
    }

    if (filter === 'upcoming') {
      list = list.filter((t) =>
        ['APPROVED', 'BOOKING', 'UPCOMING', 'IN_PROGRESS'].includes(t.status),
      );
    } else if (filter === 'planning') {
      list = list.filter((t) =>
        ['DRAFT', 'PLANNING', 'VOTING', 'PENDING_APPROVAL'].includes(t.status),
      );
    } else if (filter === 'completed') {
      list = list.filter((t) => t.status === 'COMPLETED');
    } else if (filter === 'mine') {
      list = list.filter((t) => t.organizerId === 'user-roshan');
    }

    return list;
  });

  shortBudget(n: number): string {
    if (n >= 100000) return `₹${(n / 100000).toFixed(1).replace(/\.0$/, '')}L`;
    if (n >= 1000) return `₹${Math.round(n / 1000)}k`;
    return `₹${n}`;
  }
}
