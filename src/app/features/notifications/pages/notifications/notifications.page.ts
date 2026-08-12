import { DatePipe } from '@angular/common';
import { Component, inject } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { TripStore } from '../../../../core/services/trip.store';

@Component({
  selector: 'app-notifications-page',
  standalone: true,
  imports: [MatIconModule, DatePipe],
  templateUrl: './notifications.page.html',
  styleUrl: './notifications.page.scss',
})
export class NotificationsPage {
  readonly notifications = inject(TripStore).getNotifications();
}
