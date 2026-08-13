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
import { MOCK_TASKS } from '../data/mock-data';
import { AuthService } from '../auth/auth.service';
import {
  ApiBooking,
  ApiTrip,
  ApiTripMember,
  ApiTripStatus,
  ApiTripTask,
  CreateTripPayload,
  TripApiService,
} from './trip-api.service';
import { NotificationApiService } from './notification-api.service';
import { lsGet, lsSet } from './local-storage.service';

const TASKS_KEY = 'tasks';
const SEED_KEY = 'seed-version';
const SEED_VERSION = 4;

function loadSeededTasks(): TripTask[] {
  const version = lsGet<number>(SEED_KEY, 0);
  if (version < SEED_VERSION) {
    lsSet(TASKS_KEY, MOCK_TASKS);
    lsSet(SEED_KEY, SEED_VERSION);
    return MOCK_TASKS;
  }
  return lsGet(TASKS_KEY, MOCK_TASKS);
}

const API_STATUS_TO_TRIP_STATUS: Record<ApiTripStatus, TripStatus> = {
  draft: 'DRAFT',
  planning: 'PLANNING',
  confirmed: 'UPCOMING',
  in_progress: 'IN_PROGRESS',
  completed: 'COMPLETED',
  cancelled: 'CANCELLED',
};

const MEMBER_ROLE_MAP: Record<ApiTripMember['role'], TripMember['role']> = {
  organizer: 'ORGANIZER',
  traveler: 'MEMBER',
  viewer: 'VIEWER',
};

const MEMBER_INVITE_MAP: Record<ApiTripMember['rsvpStatus'], TripMember['inviteStatus']> = {
  pending: 'INVITED',
  accepted: 'ACCEPTED',
  declined: 'DECLINED',
  maybe: 'MAYBE',
};

const MEMBER_ATTENDANCE_MAP: Record<ApiTripMember['rsvpStatus'], TripMember['attendanceStatus']> = {
  pending: 'PENDING',
  accepted: 'CONFIRMED',
  declined: 'DECLINED',
  maybe: 'PENDING',
};

function mapMember(api: ApiTripMember): TripMember {
  return {
    id: api.id,
    tripId: api.tripId,
    userId: api.userId,
    name: api.name,
    email: api.email,
    avatarUrl: api.avatarUrl ?? undefined,
    role: MEMBER_ROLE_MAP[api.role],
    inviteStatus: MEMBER_INVITE_MAP[api.rsvpStatus],
    attendanceStatus: MEMBER_ATTENDANCE_MAP[api.rsvpStatus],
  };
}

function mapBooking(api: ApiBooking): Booking {
  return { ...api, startDatetime: api.startDatetime ?? '', endDatetime: api.endDatetime ?? '' };
}

function mapTask(api: ApiTripTask): TripTask {
  return { ...api, dueDate: api.dueDate ?? '' };
}

@Injectable({ providedIn: 'root' })
export class TripStore {
  private readonly tripApi = inject(TripApiService);
  private readonly auth = inject(AuthService);

  private readonly notificationApi = inject(NotificationApiService);

  private readonly tripsSignal = signal<Trip[]>([]);
  private readonly notificationsSignal = signal<AppNotification[]>([]);
  private readonly tasksSignal = signal<TripTask[]>(loadSeededTasks());
  private readonly loadingSignal = signal(false);

  private readonly membersByTrip = signal<Record<string, TripMember[]>>({});
  private readonly availabilityByTrip = signal<Record<string, AvailabilityOption[]>>({});
  private readonly destinationsByTrip = signal<Record<string, DestinationOption[]>>({});
  private readonly itineraryByTrip = signal<Record<string, ItineraryDay[]>>({});
  private readonly bookingsByTrip = signal<Record<string, Booking[]>>({});
  private readonly budgetByTrip = signal<Record<string, BudgetCategory[]>>({});
  private readonly expensesByTrip = signal<Record<string, Expense[]>>({});
  private readonly tasksByTrip = signal<Record<string, TripTask[]>>({});

  readonly trips = this.tripsSignal.asReadonly();
  readonly loading = this.loadingSignal.asReadonly();
  readonly upcomingTrips = computed(() =>
    this.tripsSignal().filter((t) => !['COMPLETED', 'CANCELLED', 'ARCHIVED'].includes(t.status)),
  );

  constructor() {
    void this.loadTrips();
    void this.loadNotifications();
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
    return this.membersByTrip()[tripId] ?? [];
  }

  async loadMembers(tripId: string): Promise<void> {
    const members = await firstValueFrom(this.tripApi.members(tripId));
    this.membersByTrip.update((m) => ({ ...m, [tripId]: members.map(mapMember) }));
  }

  getAvailability(tripId: string): AvailabilityOption[] {
    return this.availabilityByTrip()[tripId] ?? [];
  }

  async loadAvailability(tripId: string): Promise<void> {
    const options = await firstValueFrom(this.tripApi.availability(tripId));
    this.availabilityByTrip.update((a) => ({ ...a, [tripId]: options }));
  }

  getDestinations(tripId: string): DestinationOption[] {
    return this.destinationsByTrip()[tripId] ?? [];
  }

  async loadDestinations(tripId: string): Promise<void> {
    const destinations = await firstValueFrom(this.tripApi.destinations(tripId));
    this.destinationsByTrip.update((d) => ({ ...d, [tripId]: destinations }));
  }

  getItinerary(tripId: string): ItineraryDay[] {
    return this.itineraryByTrip()[tripId] ?? [];
  }

  async loadItinerary(tripId: string): Promise<void> {
    const days = await firstValueFrom(this.tripApi.itinerary(tripId));
    this.itineraryByTrip.update((i) => ({ ...i, [tripId]: days }));
  }

  getBookings(tripId: string): Booking[] {
    return this.bookingsByTrip()[tripId] ?? [];
  }

  async loadBookings(tripId: string): Promise<void> {
    const bookings = await firstValueFrom(this.tripApi.bookings(tripId));
    this.bookingsByTrip.update((b) => ({ ...b, [tripId]: bookings.map(mapBooking) }));
  }

  getBudget(tripId: string): BudgetCategory[] {
    return this.budgetByTrip()[tripId] ?? [];
  }

  async loadBudget(tripId: string): Promise<void> {
    const categories = await firstValueFrom(this.tripApi.budget(tripId));
    this.budgetByTrip.update((b) => ({ ...b, [tripId]: categories }));
  }

  getExpenses(tripId: string): Expense[] {
    return this.expensesByTrip()[tripId] ?? [];
  }

  async loadExpenses(tripId: string): Promise<void> {
    const expenses = await firstValueFrom(this.tripApi.expenses(tripId));
    this.expensesByTrip.update((e) => ({ ...e, [tripId]: expenses }));
  }

  /** With a tripId: real API-backed per-trip tasks. Without: local task board (cross-trip, mock-backed). */
  getTasks(tripId?: string): TripTask[] {
    if (tripId) {
      return this.tasksByTrip()[tripId] ?? [];
    }
    return this.tasksSignal();
  }

  async loadTripTasks(tripId: string): Promise<void> {
    const tasks = await firstValueFrom(this.tripApi.tasks(tripId));
    this.tasksByTrip.update((t) => ({ ...t, [tripId]: tasks.map(mapTask) }));
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

  async loadNotifications(): Promise<void> {
    const notifications = await firstValueFrom(this.notificationApi.list());
    this.notificationsSignal.set(notifications);
  }

  async markNotificationRead(id: string): Promise<void> {
    this.notificationsSignal.update((list) =>
      list.map((n) => (n.id === id ? { ...n, read: true } : n)),
    );
    await firstValueFrom(this.notificationApi.markRead(id));
  }

  async markAllNotificationsRead(): Promise<void> {
    this.notificationsSignal.update((list) => list.map((n) => ({ ...n, read: true })));
    await firstValueFrom(this.notificationApi.markAllRead());
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
