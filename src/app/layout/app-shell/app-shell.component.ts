import { Component, computed, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { AuthService } from '../../core/auth/auth.service';
import { TripStore } from '../../core/services/trip.store';
import { ThemeService } from '../../core/theme/theme.service';
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
export class AppShellComponent {
  private readonly auth = inject(AuthService);
  private readonly store = inject(TripStore);
  private readonly router = inject(Router);
  private readonly theme = inject(ThemeService);

  readonly user = this.auth.user;
  readonly themeMode = this.theme.mode;
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

  toggleTheme(): void {
    this.theme.toggle();
  }

  async logout(): Promise<void> {
    await this.auth.logout();
    await this.router.navigateByUrl('/login');
  }
}
