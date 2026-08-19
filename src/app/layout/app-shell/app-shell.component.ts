import { Component, OnDestroy, OnInit, computed, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { AuthService } from '../../core/auth/auth.service';
import { TripStore } from '../../core/services/trip.store';
import { ThemeService } from '../../core/theme/theme.service';
import { ToastService } from '../../core/ui/toast.service';
import { brandIconFor } from '../../core/theme/seasonal-icons';
import { TripAdvisorComponent } from '../../shared/components/trip-advisor/trip-advisor.component';

interface NavItem {
  label: string;
  path: string;
  icon: string;
}

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    MatIconModule,
    MatTooltipModule,
    TripAdvisorComponent,
  ],
  templateUrl: './app-shell.component.html',
  styleUrl: './app-shell.component.scss',
})
export class AppShellComponent implements OnInit, OnDestroy {
  private readonly auth = inject(AuthService);
  private readonly store = inject(TripStore);
  private readonly router = inject(Router);
  private readonly theme = inject(ThemeService);
  private readonly toast = inject(ToastService);

  private seenNotificationIds = new Set<string>();
  private pollTimer: number | null = null;
  private firstNotificationPass = true;

  readonly user = this.auth.user;
  readonly themeMode = this.theme.mode;
  readonly brandIcon = brandIconFor();
  readonly unreadCount = computed(
    () => this.store.getNotifications().filter((n) => !n.read).length,
  );

  readonly initials = computed(() => {
    const u = this.user();
    if (!u) return '';
    return `${u.firstName.charAt(0)}${u.lastName.charAt(0)}`.toUpperCase();
  });

  readonly roleLabel = computed(() => {
    const role = this.user()?.role ?? '';
    const label = role.replace(/^TRIP_|^ORG_/, '').replaceAll('_', ' ').toLowerCase();
    return label.charAt(0).toUpperCase() + label.slice(1);
  });

  readonly navItems: NavItem[] = [
    { label: 'Dashboard', path: '/dashboard', icon: 'home' },
    { label: 'My Trips', path: '/trips', icon: 'map' },
    { label: 'Explore', path: '/explore', icon: 'travel_explore' },
    { label: 'Calendar', path: '/calendar', icon: 'calendar_today' },
    { label: 'Tasks', path: '/tasks', icon: 'check_box' },
    { label: 'Expenses', path: '/expenses', icon: 'credit_card' },
    { label: 'Notifications', path: '/notifications', icon: 'notifications' },
  ];

  readonly mobileNav: NavItem[] = [
    { label: 'Home', path: '/dashboard', icon: 'home' },
    { label: 'Trips', path: '/trips', icon: 'map' },
    { label: 'Create', path: '/trips/create', icon: 'add' },
    { label: 'Tasks', path: '/tasks', icon: 'check_box' },
    { label: 'Profile', path: '/profile', icon: 'person' },
  ];

  ngOnInit(): void {
    void this.refreshNotifications(true);
    this.pollTimer = window.setInterval(() => {
      void this.refreshNotifications(false);
    }, 45000);
  }

  ngOnDestroy(): void {
    if (this.pollTimer != null) {
      window.clearInterval(this.pollTimer);
      this.pollTimer = null;
    }
  }

  toggleTheme(): void {
    this.theme.toggle();
  }

  async logout(): Promise<void> {
    await this.auth.logout();
    this.toast.info('You have been signed out.', 'Logged out');
    await this.router.navigateByUrl('/login');
  }

  private async refreshNotifications(initial: boolean): Promise<void> {
    try {
      await this.store.loadNotifications();
    } catch {
      if (initial) {
        this.toast.warning('Could not refresh inbox alerts right now.', 'Notifications');
      }
      return;
    }

    const list = this.store.getNotifications();
    if (this.firstNotificationPass) {
      for (const n of list) this.seenNotificationIds.add(n.id);
      this.firstNotificationPass = false;
      return;
    }

    const fresh = list.filter((n) => !this.seenNotificationIds.has(n.id));
    for (const n of fresh.slice(0, 3)) {
      this.seenNotificationIds.add(n.id);
      this.toast.notify(n.title || 'New notification', n.message || 'You have a new update.');
    }
    for (const n of list) this.seenNotificationIds.add(n.id);
  }
}
