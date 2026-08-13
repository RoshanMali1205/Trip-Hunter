import { Injectable, computed, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import {
  AvailabilityOption,
  Booking,
  BudgetCategory,
  DashboardSummary,
  DestinationOption,
  Expense,
  ItineraryDay,
  Trip,
  TripMember,
  TripStatus,
  TripTask,
  AppNotification,
} from '../models/trip.model';
import {
  MOCK_AVAILABILITY,
  MOCK_BOOKINGS,
  MOCK_BUDGET,
  MOCK_DESTINATIONS,
  MOCK_EXPENSES,
  MOCK_ITINERARY,
  MOCK_MEMBERS,
  MOCK_NOTIFICATIONS,
  MOCK_TASKS,
} from '../data/mock-data';
import { AuthService } from '../auth/auth.service';
import { ApiTrip, ApiTripStatus, CreateTripPayload, TripApiService } from './trip-api.service';
import { lsGet, lsSet } from './local-storage.service';

const NOTIF_KEY = 'notifications';
const TASKS_KEY = 'tasks';
const SEED_KEY = 'seed-version';
const SEED_VERSION = 3;

function loadSeeded<T>(key: string, seed: T): T {
  const version = lsGet<number>(SEED_KEY, 0);
  if (version < SEED_VERSION) {
    lsSet(NOTIF_KEY, MOCK_NOTIFICATIONS);
    lsSet(TASKS_KEY, MOCK_TASKS);
    lsSet(SEED_KEY, SEED_VERSION);
    if (key === NOTIF_KEY) return MOCK_NOTIFICATIONS as T;
    if (key === TASKS_KEY) return MOCK_TASKS as T;
  }
  return lsGet(key, seed);
}

const API_STATUS_TO_TRIP_STATUS: Record<ApiTripStatus, TripStatus> = {
  draft: 'DRAFT',
  planning: 'PLANNING',
  confirmed: 'UPCOMING',
  in_progress: 'IN_PROGRESS',
  completed: 'COMPLETED',
  cancelled: 'CANCELLED',
};

@Injectable({ providedIn: 'root' })
export class TripStore {
  private readonly tripApi = inject(TripApiService);
  private readonly auth = inject(AuthService);

  private readonly tripsSignal = signal<Trip[]>([]);
  private readonly notificationsSignal = signal<AppNotification[]>(
    loadSeeded(NOTIF_KEY, MOCK_NOTIFICATIONS),
  );
  private readonly tasksSignal = signal<TripTask[]>(loadSeeded(TASKS_KEY, MOCK_TASKS));
  private readonly loadingSignal = signal(false);

  readonly trips = this.tripsSignal.asReadonly();
  readonly loading = this.loadingSignal.asReadonly();
  readonly upcomingTrips = computed(() =>
    this.tripsSignal().filter((t) => !['COMPLETED', 'CANCELLED', 'ARCHIVED'].includes(t.status)),
  );

  constructor() {
    void this.loadTrips();
  }

  private mapApiTrip(api: ApiTrip): Trip {
    const currentUser = this.auth.user();
    const organizerName =
      api.createdBy && currentUser?.id === api.createdBy
        ? `${currentUser.firstName} ${currentUser.lastName}`.trim()
        : 'Team member';

    return {
      id: api.id,
      organizationId: api.organizationId,
      title: api.name,
      description: api.description,
      tripType: 'TEAM_OUTING',
      startDate: api.startDate,
      endDate: api.endDate,
      origin: '',
      destination: api.destination,
      status: API_STATUS_TO_TRIP_STATUS[api.status],
      approvalStatus: 'NOT_REQUIRED',
      currency: api.currency,
      estimatedBudget: api.budgetCents / 100,
      actualBudget: 0,
      maxMembers: 20,
      memberCount: 1,
      organizerId: api.createdBy ?? '',
      organizerName,
      createdAt: api.createdAt,
      updatedAt: api.updatedAt,
    };
  }

  async loadTrips(): Promise<void> {
    this.loadingSignal.set(true);
    try {
      const apiTrips = await firstValueFrom(this.tripApi.list());
      this.tripsSignal.set(apiTrips.map((t) => this.mapApiTrip(t)));
    } finally {
      this.loadingSignal.set(false);
    }
  }

  private persistNotifications(): void {
    lsSet(NOTIF_KEY, this.notificationsSignal());
  }

  private persistTasks(): void {
    lsSet(TASKS_KEY, this.tasksSignal());
  }

  getById(id: string): Trip | undefined {
    return this.tripsSignal().find((t) => t.id === id);
  }

  async createTrip(partial: Partial<Trip>): Promise<Trip> {
    const payload: CreateTripPayload = {
      name: partial.title || 'Untitled trip',
      description: partial.description || '',
      destination: partial.destination || '',
      startDate: partial.startDate ?? null,
      endDate: partial.endDate ?? null,
      currency: partial.currency || 'INR',
      budgetCents: Math.round((partial.estimatedBudget || 0) * 100),
    };
    const apiTrip = await firstValueFrom(this.tripApi.create(payload));
    const trip = this.mapApiTrip(apiTrip);
    this.tripsSignal.update((list) => [trip, ...list]);
    return trip;
  }

  getMembers(tripId: string): TripMember[] {
    return MOCK_MEMBERS.filter((m) => m.tripId === tripId);
  }

  getAvailability(tripId: string): AvailabilityOption[] {
    return MOCK_AVAILABILITY.filter((a) => a.tripId === tripId);
  }

  getDestinations(tripId: string): DestinationOption[] {
    return MOCK_DESTINATIONS.filter((d) => d.tripId === tripId);
  }

  getItinerary(tripId: string): ItineraryDay[] {
    return MOCK_ITINERARY.filter((d) => d.tripId === tripId);
  }

  getBookings(tripId: string): Booking[] {
    return MOCK_BOOKINGS.filter((b) => b.tripId === tripId);
  }

  getBudget(tripId: string): BudgetCategory[] {
    return MOCK_BUDGET.filter((b) => b.tripId === tripId);
  }

  getExpenses(tripId: string): Expense[] {
    return MOCK_EXPENSES.filter((e) => e.tripId === tripId);
  }

  getTasks(tripId?: string): TripTask[] {
    const all = this.tasksSignal();
    return tripId ? all.filter((t) => t.tripId === tripId) : all;
  }

  updateTaskStatus(taskId: string, status: TripTask['status']): void {
    this.tasksSignal.update((list) =>
      list.map((t) => (t.id === taskId ? { ...t, status } : t)),
    );
    this.persistTasks();
  }

  getNotifications(): AppNotification[] {
    return this.notificationsSignal();
  }

  markNotificationRead(id: string): void {
    this.notificationsSignal.update((list) =>
      list.map((n) => (n.id === id ? { ...n, read: true } : n)),
    );
    this.persistNotifications();
  }

  markAllNotificationsRead(): void {
    this.notificationsSignal.update((list) => list.map((n) => ({ ...n, read: true })));
    this.persistNotifications();
  }

  getDashboard(): DashboardSummary {
    const openTasks = this.getTasks().filter((t) => t.status !== 'COMPLETED');
    return {
      upcomingTrips: this.upcomingTrips().slice(0, 4),
      pendingApprovals: this.tripsSignal().filter((t) => t.approvalStatus === 'PENDING').length,
      myTasks: openTasks,
      expenseSummary: {
        youPaid: 18500,
        yourShare: 12300,
        youReceive: 6200,
      },
      recentActivity: [
        { id: 'a1', message: 'Amit updated the hotel booking', createdAt: new Date(Date.now() - 2 * 3600000).toISOString() },
        { id: 'a2', message: 'Ravi added a ₹2,500 expense', createdAt: new Date(Date.now() - 5 * 3600000).toISOString() },
        { id: 'a3', message: 'Manager approved the Goa trip', createdAt: new Date(Date.now() - 86400000).toISOString() },
      ],
    };
  }
}
