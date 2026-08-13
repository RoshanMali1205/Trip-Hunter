import { DatePipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { TripStore } from '../../../../core/services/trip.store';
import { ToastService } from '../../../../core/ui/toast.service';
import { ButtonComponent } from '../../../../shared/components/button/button.component';

@Component({
  selector: 'app-notifications-page',
  standalone: true,
  imports: [MatIconModule, DatePipe, RouterLink, ButtonComponent],
  templateUrl: './notifications.page.html',
  styleUrl: './notifications.page.scss',
})
export class NotificationsPage {
  private readonly store = inject(TripStore);
  private readonly toast = inject(ToastService);
  readonly notifications = computed(() => this.store.getNotifications());
  readonly pendingInvites = computed(() => this.store.getPendingInvites());
  readonly unread = computed(() => this.notifications().filter((n) => !n.read).length);
  readonly respondingId = signal<string | null>(null);

  markAll(): void {
    void this.store.markAllNotificationsRead();
    this.toast.success('All notifications marked as read.', 'Inbox updated');
  }

  markOne(id: string): void {
    void this.store.markNotificationRead(id);
  }

  async respond(tripId: string, rsvpStatus: 'accepted' | 'declined'): Promise<void> {
    this.respondingId.set(tripId);
    try {
      await this.store.respondToInvite(tripId, rsvpStatus);
      if (rsvpStatus === 'accepted') {
        this.toast.success('You’re in — trip invite accepted.', 'Invite accepted');
      } else {
        this.toast.info('Invite declined.', 'Invite updated');
      }
    } catch {
      this.toast.error('Could not update that invite. Try again.', 'Invite failed');
    } finally {
      this.respondingId.set(null);
    }
  }
}
