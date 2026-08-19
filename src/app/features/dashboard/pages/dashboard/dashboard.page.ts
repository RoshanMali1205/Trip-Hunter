import { DatePipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { AuthService } from '../../../../core/auth/auth.service';
import { Trip } from '../../../../core/models/trip.model';
import { TripStore } from '../../../../core/services/trip.store';
import { ToastService } from '../../../../core/ui/toast.service';
import { InrCurrencyPipe, StatusLabelPipe } from '../../../../shared/pipes/format.pipe';
import { ButtonComponent } from '../../../../shared/components/button/button.component';
import { LazySrcDirective, ScrollRevealDirective } from '../../../../shared/directives/scroll-reveal.directive';

type TripCategory = 'all' | 'beaches' | 'hills' | 'cities' | 'adventure';

@Component({
  selector: 'app-dashboard-page',
  standalone: true,
  imports: [
    RouterLink,
    MatIconModule,
    FormsModule,
    InrCurrencyPipe,
    StatusLabelPipe,
    DatePipe,
    ButtonComponent,
    ScrollRevealDirective,
    LazySrcDirective,
  ],
  templateUrl: './dashboard.page.html',
  styleUrl: './dashboard.page.scss',
})
export class DashboardPage {
  private readonly auth = inject(AuthService);
  private readonly store = inject(TripStore);
  private readonly toast = inject(ToastService);

  readonly user = this.auth.user;
  readonly summary = computed(() => this.store.getDashboard());
  readonly pendingInvites = computed(() => this.store.getPendingInvites());
  readonly search = signal('');
  readonly category = signal<TripCategory>('all');
  readonly respondingId = signal<string | null>(null);

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

  readonly categories = [
    { id: 'all' as const, label: 'All', icon: 'public' },
    { id: 'beaches' as const, label: 'Beaches', icon: 'beach_access' },
    { id: 'hills' as const, label: 'Hills', icon: 'terrain' },
    { id: 'cities' as const, label: 'Cities', icon: 'location_city' },
    { id: 'adventure' as const, label: 'Adventure', icon: 'hiking' },
  ];

  readonly valueProps = [
    { icon: 'apartment', label: 'Handpicked stays' },
    { icon: 'event_available', label: 'Flexible planning' },
    { icon: 'payments', label: 'Shared expenses' },
    { icon: 'verified', label: 'Manager approvals' },
  ] as const;

  readonly inspirationTiles = [
    {
      label: 'Goa dusk',
      caption: 'Anjuna offsites by the water',
      rating: '4.9',
      from: '₹12k',
      imageUrl:
        'https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?auto=format&fit=crop&w=900&q=80',
    },
    {
      label: 'Kerala stills',
      caption: 'Backwaters after the stand-up',
      rating: '4.8',
      from: '₹11k',
      imageUrl:
        'https://images.unsplash.com/photo-1602216056096-3b40cc0c9944?auto=format&fit=crop&w=900&q=80',
    },
    {
      label: 'Himachal air',
      caption: 'Pine roads and cool planning',
      rating: '4.7',
      from: '₹9k',
      imageUrl:
        'https://images.unsplash.com/photo-1626621341517-bbf3d9990a23?auto=format&fit=crop&w=900&q=80',
    },
    {
      label: 'Jaipur gold',
      caption: 'Forts for the colour brief',
      rating: '4.8',
      from: '₹10k',
      imageUrl:
        'https://images.unsplash.com/photo-1477587458883-47145ed94245?auto=format&fit=crop&w=900&q=80',
    },
    {
      label: 'Udaipur lakes',
      caption: 'Closing dinner on the water',
      rating: '4.9',
      from: '₹14k',
      imageUrl:
        'https://images.unsplash.com/photo-1695956353120-54ce5e91632b?auto=format&fit=crop&w=900&q=80',
    },
    {
      label: 'Ladakh high',
      caption: 'Passes above the noise',
      rating: '4.9',
      from: '₹16k',
      imageUrl:
        'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?auto=format&fit=crop&w=900&q=80',
    },
  ] as const;

  readonly lookbookStills = [
    {
      alt: 'Coastline at dusk',
      src: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=700&q=80',
    },
    {
      alt: 'Mountain lake',
      src: 'https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?auto=format&fit=crop&w=700&q=80',
    },
    {
      alt: 'Hill town street',
      src: 'https://images.unsplash.com/photo-1596176530529-78163a4f7af2?auto=format&fit=crop&w=700&q=80',
    },
  ] as const;

  readonly featuredTrip = computed(() => this.summary().upcomingTrips[0] ?? null);

  readonly filteredTrips = computed(() => {
    const q = this.search().trim().toLowerCase();
    const cat = this.category();
    return this.summary().upcomingTrips.filter((trip) => {
      const hay = `${trip.title} ${trip.destination} ${trip.origin} ${trip.tripType}`.toLowerCase();
      if (q && !hay.includes(q)) return false;
      return this.matchesCategory(trip, cat);
    });
  });

  readonly heroImage = computed(() => {
    return (
      this.featuredTrip()?.coverImageUrl ||
      'https://images.unsplash.com/photo-1540202404-a2f29016b523?auto=format&fit=crop&w=1600&q=80'
    );
  });

  setCategory(id: TripCategory): void {
    this.category.set(id);
  }

  async respondToInvite(tripId: string, status: 'accepted' | 'declined'): Promise<void> {
    this.respondingId.set(tripId);
    try {
      await this.store.respondToInvite(tripId, status);
      if (status === 'accepted') {
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

  ratingFor(trip: Trip): string {
    const base = 4.4 + (trip.memberCount % 5) * 0.1;
    return base.toFixed(1);
  }

  private matchesCategory(trip: Trip, cat: TripCategory): boolean {
    if (cat === 'all') return true;
    const dest = `${trip.destination} ${trip.title}`.toLowerCase();
    if (cat === 'beaches') {
      return /goa|beach|alibaug|coast|baga|calangute/.test(dest);
    }
    if (cat === 'hills') {
      return /lonavala|mahabaleshwar|hill|alpine|mountain/.test(dest);
    }
    if (cat === 'cities') {
      return /bangalore|hyderabad|mumbai|pune|delhi|city/.test(dest);
    }
    return /adventure|outing|offsite|water|trek/.test(
      `${trip.tripType} ${trip.description}`.toLowerCase(),
    );
  }
}
