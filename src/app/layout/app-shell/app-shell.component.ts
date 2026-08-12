import { Component, computed, inject, signal } from '@angular/core';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { filter } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
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
  imports: [RouterOutlet, RouterLink, RouterLinkActive, MatIconModule, MatButtonModule, MatTooltipModule],
  templateUrl: './app-shell.component.html',
  styleUrl: './app-shell.component.scss',
})
export class AppShellComponent {
  private readonly auth = inject(AuthService);
  private readonly store = inject(TripStore);
  private readonly router = inject(Router);

  readonly sidebarOpen = signal(true);
  readonly user = this.auth.user;
  readonly unreadCount = computed(
    () => this.store.getNotifications().filter((n) => !n.read).length,
  );

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

  readonly pageTitle = signal('Dashboard');

  constructor() {
    this.router.events
      .pipe(
        filter((e): e is NavigationEnd => e instanceof NavigationEnd),
        takeUntilDestroyed(),
      )
      .subscribe((e) => {
        const path = e.urlAfterRedirects.split('?')[0];
        if (path.startsWith('/trips/create')) this.pageTitle.set('Create trip');
        else if (path.startsWith('/trips/')) this.pageTitle.set('Trip details');
        else if (path.startsWith('/trips')) this.pageTitle.set('My trips');
        else if (path.startsWith('/notifications')) this.pageTitle.set('Notifications');
        else if (path.startsWith('/profile')) this.pageTitle.set('Profile');
        else if (path.startsWith('/calendar')) this.pageTitle.set('Calendar');
        else if (path.startsWith('/tasks')) this.pageTitle.set('Tasks');
        else if (path.startsWith('/expenses')) this.pageTitle.set('Expenses');
        else this.pageTitle.set('Dashboard');
      });
  }

  toggleSidebar(): void {
    this.sidebarOpen.update((v) => !v);
  }

  logout(): void {
    this.auth.logout();
    void this.router.navigateByUrl('/login');
  }
}
