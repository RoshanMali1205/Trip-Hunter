import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatInputModule } from '@angular/material/input';
import { TripStore } from '../../../../core/services/trip.store';
import { TripCardComponent } from '../../../../shared/components/trip-card/trip-card.component';

@Component({
  selector: 'app-trip-list-page',
  standalone: true,
  imports: [
    RouterLink,
    FormsModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatSelectModule,
    MatInputModule,
    TripCardComponent,
  ],
  templateUrl: './trip-list.page.html',
  styleUrl: './trip-list.page.scss',
})
export class TripListPage {
  private readonly store = inject(TripStore);

  readonly search = signal('');
  readonly filter = signal<'all' | 'upcoming' | 'planning' | 'completed' | 'mine'>('all');
  readonly sort = signal<'newest' | 'date' | 'budget'>('newest');

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
      list = list.filter((t) => ['APPROVED', 'BOOKING', 'UPCOMING', 'IN_PROGRESS'].includes(t.status));
    } else if (filter === 'planning') {
      list = list.filter((t) =>
        ['DRAFT', 'PLANNING', 'VOTING', 'PENDING_APPROVAL'].includes(t.status),
      );
    } else if (filter === 'completed') {
      list = list.filter((t) => t.status === 'COMPLETED');
    } else if (filter === 'mine') {
      list = list.filter((t) => t.organizerId === 'user-roshan');
    }

    const sort = this.sort();
    list.sort((a, b) => {
      if (sort === 'budget') return b.estimatedBudget - a.estimatedBudget;
      if (sort === 'date') return (a.startDate || '').localeCompare(b.startDate || '');
      return b.createdAt.localeCompare(a.createdAt);
    });
    return list;
  });
}
