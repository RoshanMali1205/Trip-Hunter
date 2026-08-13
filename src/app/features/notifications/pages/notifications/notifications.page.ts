import { DatePipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { TripStore } from '../../../../core/services/trip.store';
import { ButtonComponent } from '../../../../shared/components/button/button.component';
import { PAGE_HERO_IMAGES } from '../../../../core/constants/page-hero-images';

@Component({
  selector: 'app-notifications-page',
  standalone: true,
  imports: [MatIconModule, DatePipe, RouterLink, ButtonComponent],
  templateUrl: './notifications.page.html',
  styleUrl: './notifications.page.scss',
})
export class NotificationsPage {
  private readonly store = inject(TripStore);
  readonly heroImage = PAGE_HERO_IMAGES.notifications;
  readonly notifications = computed(() => this.store.getNotifications());
  readonly pendingInvites = computed(() => this.store.getPendingInvites());
  readonly unread = computed(() => this.notifications().filter((n) => !n.read).length);
  readonly respondingId = signal<string | null>(null);

  markAll(): void {
    void this.store.markAllNotificationsRead();
  }

  markOne(id: string): void {
    void this.store.markNotificationRead(id);
  }

  async respond(tripId: string, rsvpStatus: 'accepted' | 'declined'): Promise<void> {
    this.respondingId.set(tripId);
    try {
      await this.store.respondToInvite(tripId, rsvpStatus);
    } finally {
      this.respondingId.set(null);
    }
  }
}
