import { Routes } from '@angular/router';
import { authGuard, guestGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  {
    path: 'login',
    canActivate: [guestGuard],
    loadComponent: () =>
      import('./features/auth/pages/login/login.page').then((m) => m.LoginPage),
  },
  {
    path: 'auth/callback',
    loadComponent: () =>
      import('./features/auth/pages/auth-callback/auth-callback.page').then(
        (m) => m.AuthCallbackPage,
      ),
  },
  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./layout/app-shell/app-shell.component').then((m) => m.AppShellComponent),
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./features/dashboard/pages/dashboard/dashboard.page').then(
            (m) => m.DashboardPage,
          ),
      },
      {
        path: 'trips',
        loadChildren: () =>
          import('./features/trips/trips.routes').then((m) => m.TRIP_ROUTES),
      },
      {
        path: 'notifications',
        loadComponent: () =>
          import('./features/notifications/pages/notifications/notifications.page').then(
            (m) => m.NotificationsPage,
          ),
      },
      {
        path: 'profile',
        loadComponent: () =>
          import('./features/profile/pages/profile/profile.page').then((m) => m.ProfilePage),
      },
      {
        path: 'calendar',
        loadComponent: () =>
          import('./features/misc/pages/calendar/calendar.page').then((m) => m.CalendarPage),
      },
      {
        path: 'tasks',
        loadComponent: () =>
          import('./features/misc/pages/tasks/tasks.page').then((m) => m.TasksPage),
      },
      {
        path: 'expenses',
        loadComponent: () =>
          import('./features/misc/pages/expenses/expenses.page').then((m) => m.ExpensesPage),
      },
      {
        path: 'teams',
        loadComponent: () =>
          import('./features/misc/pages/teams/teams.page').then((m) => m.TeamsPage),
      },
      {
        path: 'admin',
        redirectTo: 'teams',
        pathMatch: 'full',
      },
    ],
  },
  { path: '**', redirectTo: 'dashboard' },
];
