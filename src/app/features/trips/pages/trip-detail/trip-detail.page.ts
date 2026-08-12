import { Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { map } from 'rxjs';
import { MatIconModule } from '@angular/material/icon';
import { TripStore } from '../../../../core/services/trip.store';
import { StatusLabelPipe, TripDatePipe } from '../../../../shared/pipes/format.pipe';

@Component({
  selector: 'app-trip-detail-page',
  standalone: true,
  imports: [
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    MatIconModule,
    TripDatePipe,
    StatusLabelPipe,
  ],
  templateUrl: './trip-detail.page.html',
  styleUrl: './trip-detail.page.scss',
})
export class TripDetailPage {
  private readonly route = inject(ActivatedRoute);
  private readonly store = inject(TripStore);

  private readonly tripId = toSignal(
    this.route.paramMap.pipe(map((p) => p.get('tripId') || '')),
    { initialValue: '' },
  );

  readonly trip = computed(() => this.store.getById(this.tripId()));
  readonly members = computed(() => this.store.getMembers(this.tripId()));
  readonly memberPreview = computed(() => this.members().slice(0, 4));
  readonly extraMembers = computed(() => Math.max(0, (this.trip()?.memberCount ?? 0) - 4));

  readonly durationLabel = computed(() => {
    const t = this.trip();
    if (!t?.startDate || !t.endDate) return '';
    const days =
      Math.round(
        (new Date(t.endDate).getTime() - new Date(t.startDate).getTime()) / 86400000,
      ) + 1;
    return `${days} days`;
  });

  initials(name: string): string {
    return name
      .split(' ')
      .map((p) => p[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();
  }

  readonly tabs = [
    { path: 'overview', label: 'Overview' },
    { path: 'members', label: 'Members' },
    { path: 'voting', label: 'Polls' },
    { path: 'itinerary', label: 'Itinerary' },
    { path: 'bookings', label: 'Bookings' },
    { path: 'budget', label: 'Budget' },
    { path: 'expenses', label: 'Expenses' },
    { path: 'tasks', label: 'Tasks' },
    { path: 'documents', label: 'Documents' },
    { path: 'activity', label: 'Activity' },
  ];
}
