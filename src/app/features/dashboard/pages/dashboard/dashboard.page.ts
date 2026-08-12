import { DatePipe } from '@angular/common';
import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { AuthService } from '../../../../core/auth/auth.service';
import { TripStore } from '../../../../core/services/trip.store';
import { TripCardComponent } from '../../../../shared/components/trip-card/trip-card.component';
import { InrCurrencyPipe } from '../../../../shared/pipes/format.pipe';

@Component({
  selector: 'app-dashboard-page',
  standalone: true,
  imports: [RouterLink, MatButtonModule, MatIconModule, TripCardComponent, InrCurrencyPipe, DatePipe],
  templateUrl: './dashboard.page.html',
  styleUrl: './dashboard.page.scss',
})
export class DashboardPage {
  private readonly auth = inject(AuthService);
  private readonly store = inject(TripStore);

  readonly user = this.auth.user;
  readonly summary = this.store.getDashboard();
}
