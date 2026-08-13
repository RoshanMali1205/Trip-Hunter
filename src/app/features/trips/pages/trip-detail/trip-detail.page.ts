import { Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { map } from 'rxjs';
import { MatIconModule } from '@angular/material/icon';
import { AuthService } from '../../../../core/auth/auth.service';
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
  private readonly router = inject(Router);
  private readonly store = inject(TripStore);
  private readonly auth = inject(AuthService);

  private readonly tripId = toSignal(
    this.route.paramMap.pipe(map((p) => p.get('tripId') || '')),
    { initialValue: '' },
  );

  readonly loading = this.store.loading;
  readonly deleting = signal(false);
  readonly trip = computed(() => this.store.getById(this.tripId()));
  readonly isOwner = computed(() => {
    const t = this.trip();
    const userId = this.auth.user()?.id;
    return !!t && !!userId && t.organizerId === userId;
  });
  readonly members = computed(() => this.store.getMembers(this.tripId()));
  readonly memberPreview = computed(() => this.members().slice(0, 4));
  readonly extraMembers = computed(() => Math.max(0, (this.trip()?.memberCount ?? 0) - 4));

  async deleteTrip(): Promise<void> {
    const t = this.trip();
    if (!t) return;
    if (!confirm(`Delete "${t.title}"? This removes all its members, itinerary, bookings, budget, expenses, and tasks. This can't be undone.`)) {
      return;
    }
    this.deleting.set(true);
    try {
      await this.store.deleteTrip(t.id);
      void this.router.navigate(['/trips']);
    } finally {
      this.deleting.set(false);
    }
  }

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
