import { Component, computed, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { AuthService } from '../../core/auth/auth.service';
import { TripStore } from '../../core/services/trip.store';

interface NavItem {
  label: string;
  path: string;
  icon: string;
}

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, MatIconModule, MatTooltipModule],
  templateUrl: './app-shell.component.html',
  styleUrl: './app-shell.component.scss',
})
export class AppShellComponent {
  private readonly auth = inject(AuthService);
  private readonly store = inject(TripStore);
  private readonly router = inject(Router);

  readonly user = this.auth.user;
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
    { label: 'Dashboard', path: '/dashboard', icon: 'dashboard' },
    { label: 'My Trips', path: '/trips', icon: 'flight_takeoff' },
    { label: 'Calendar', path: '/calendar', icon: 'calendar_month' },
    { label: 'Tasks', path: '/tasks', icon: 'task_alt' },
    { label: 'Expenses', path: '/expenses', icon: 'account_balance_wallet' },
    { label: 'Notifications', path: '/notifications', icon: 'notifications' },
  ];

  readonly mobileNav: NavItem[] = [
    { label: 'Home', path: '/dashboard', icon: 'home' },
    { label: 'Trips', path: '/trips', icon: 'flight_takeoff' },
    { label: 'Create', path: '/trips/create', icon: 'add_circle' },
    { label: 'Tasks', path: '/tasks', icon: 'task_alt' },
    { label: 'Profile', path: '/profile', icon: 'person' },
  ];

  logout(): void {
    this.auth.logout();
    void this.router.navigateByUrl('/login');
  }
}
