import { Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { map } from 'rxjs';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { TripStore } from '../../../../core/services/trip.store';
import { InrCurrencyPipe, StatusLabelPipe, TripDatePipe } from '../../../../shared/pipes/format.pipe';

@Component({
  selector: 'app-trip-detail-page',
  standalone: true,
  imports: [
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    MatButtonModule,
    MatIconModule,
    InrCurrencyPipe,
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
