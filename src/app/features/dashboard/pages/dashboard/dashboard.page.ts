import { DatePipe } from '@angular/common';
import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { AuthService } from '../../../../core/auth/auth.service';
import { TripStore } from '../../../../core/services/trip.store';
import { InrCurrencyPipe, StatusLabelPipe } from '../../../../shared/pipes/format.pipe';

@Component({
  selector: 'app-dashboard-page',
  standalone: true,
  imports: [RouterLink, MatIconModule, InrCurrencyPipe, StatusLabelPipe, DatePipe],
  templateUrl: './dashboard.page.html',
  styleUrl: './dashboard.page.scss',
})
export class DashboardPage {
  private readonly auth = inject(AuthService);
  private readonly store = inject(TripStore);

  readonly user = this.auth.user;
  readonly summary = computed(() => this.store.getDashboard());
  readonly initials = computed(() => {
    const u = this.user();
    return u ? `${u.firstName[0]}${u.lastName[0]}`.toUpperCase() : '';
  });

  readonly greeting = computed(() => {
    const h = new Date().getHours();
    const name = this.user()?.firstName ?? 'there';
    if (h < 12) return `Good morning, ${name}`;
    if (h < 17) return `Good afternoon, ${name}`;
    return `Good evening, ${name}`;
  });

  readonly todayLabel = new Date().toLocaleDateString('en-IN', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  readonly mobileDate = new Date().toLocaleDateString('en-IN', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });

  readonly inspirationTiles = [
    {
      label: 'Resort stays',
      caption: 'Pool decks & team dinners',
      imageUrl:
        'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=900&q=80',
    },
    {
      label: 'Volvo nights',
      caption: 'Comfort coaches to the coast',
      imageUrl:
        'https://images.unsplash.com/photo-1544620341-1adc1baa1b6c?auto=format&fit=crop&w=900&q=80',
    },
    {
      label: 'Hill retreats',
      caption: 'Quiet planning weekends',
      imageUrl:
        'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?auto=format&fit=crop&w=900&q=80',
    },
    {
      label: 'Water sports',
      caption: 'Beach bonding hours',
      imageUrl:
        'https://images.unsplash.com/photo-1502680390469-be75c6c3395d?auto=format&fit=crop&w=900&q=80',
    },
  ] as const;

  coverStyle(url?: string): string {
    return url ? `url(${url})` : 'none';
  }

  daysToGo(start: string | null): string {
    if (!start) return 'Dates TBD';
    const diff = Math.ceil((new Date(start).getTime() - Date.now()) / 86400000);
    if (diff < 0) return 'In progress / past';
    if (diff === 0) return 'Today';
    return `${diff} days to go`;
  }

  shortBudget(n: number): string {
    if (n >= 100000) return `₹${(n / 100000).toFixed(1).replace(/\.0$/, '')}L`;
    if (n >= 1000) return `₹${Math.round(n / 1000)}k`;
    return `₹${n}`;
  }
}
