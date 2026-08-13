import { DatePipe } from '@angular/common';
import { Component, computed, inject } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { TripStore } from '../../../../core/services/trip.store';
import { ButtonComponent } from '../../../../shared/components/button/button.component';

@Component({
  selector: 'app-notifications-page',
  standalone: true,
  imports: [MatIconModule, DatePipe, ButtonComponent],
  templateUrl: './notifications.page.html',
  styleUrl: './notifications.page.scss',
})
export class NotificationsPage {
  private readonly store = inject(TripStore);
  readonly notifications = computed(() => this.store.getNotifications());
  readonly unread = computed(() => this.notifications().filter((n) => !n.read).length);

  markAll(): void {
    this.store.markAllNotificationsRead();
  }

  markOne(id: string): void {
    this.store.markNotificationRead(id);
  }
}
