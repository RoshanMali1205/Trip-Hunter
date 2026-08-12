import { Routes } from '@angular/router';
import {
  TripActivityPage,
  TripBookingsPage,
  TripBudgetPage,
  TripDocumentsPage,
  TripExpensesPage,
  TripItineraryPage,
  TripMembersPage,
  TripOverviewPage,
  TripTasksTabPage,
  TripVotingPage,
} from './pages/trip-tabs/trip-tabs.pages';

export const TRIP_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/trip-list/trip-list.page').then((m) => m.TripListPage),
  },
  {
    path: 'create',
    loadComponent: () =>
      import('./pages/trip-create/trip-create.page').then((m) => m.TripCreatePage),
  },
  {
    path: ':tripId',
    loadComponent: () =>
      import('./pages/trip-detail/trip-detail.page').then((m) => m.TripDetailPage),
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'overview' },
      { path: 'overview', component: TripOverviewPage },
      { path: 'members', component: TripMembersPage },
      { path: 'voting', component: TripVotingPage },
      { path: 'availability', component: TripVotingPage },
      { path: 'itinerary', component: TripItineraryPage },
      { path: 'bookings', component: TripBookingsPage },
      { path: 'budget', component: TripBudgetPage },
      { path: 'expenses', component: TripExpensesPage },
      { path: 'tasks', component: TripTasksTabPage },
      { path: 'documents', component: TripDocumentsPage },
      { path: 'activity', component: TripActivityPage },
    ],
  },
];
