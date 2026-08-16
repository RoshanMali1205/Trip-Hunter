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
  TripType,
  ApprovalStatus,
  AppNotification,
} from '../models/trip.model';
import { AuthService } from '../auth/auth.service';
import {
  ApiAvailVote,
  ApiActivity,
  ApiApproval,
  ApiBooking,
  ApiComment,
  ApiDestinationOption,
  ApiExpenseSummary,
  ApiMyVotes,
  ApiPendingInvite,
  ApiSettlement,
  ApiTrip,
  ApiTripApprovalStatus,
  ApiTripMember,
  ApiTripStatus,
  ApiTripTask,
  ApiTripType,
  CreateAvailabilityOptionPayload,
  CreateBookingPayload,
  CreateBudgetCategoryPayload,
  CreateCommentPayload,
  CreateDestinationPayload,
  CreateExpensePayload,
  CreateItineraryItemPayload,
  CreateTaskPayload,
  CreateTripPayload,
  TripApiService,
  UpdateBudgetCategoryPayload,
  UpdateTripPayload,
} from './trip-api.service';
import { NotificationApiService } from './notification-api.service';
import { bookingImageUrl } from '../constants/booking-images';
import { destinationImageUrl } from '../constants/destination-images';

const API_STATUS_TO_TRIP_STATUS: Record<ApiTripStatus, TripStatus> = {
  draft: 'DRAFT',
  planning: 'PLANNING',
  confirmed: 'UPCOMING',
  in_progress: 'IN_PROGRESS',
  completed: 'COMPLETED',
  cancelled: 'CANCELLED',
};

const API_TYPE_TO_TRIP_TYPE: Record<ApiTripType, TripType> = {
  business: 'BUSINESS',
  team_outing: 'TEAM_OUTING',
  corporate_offsite: 'CORPORATE_OFFSITE',
  training_conference: 'TRAINING_CONFERENCE',
  project_visit: 'PROJECT_VISIT',
  personal_group: 'PERSONAL_GROUP',
};

const TRIP_TYPE_TO_API: Record<TripType, ApiTripType> = {
  BUSINESS: 'business',
  TEAM_OUTING: 'team_outing',
  CORPORATE_OFFSITE: 'corporate_offsite',
  TRAINING_CONFERENCE: 'training_conference',
  PROJECT_VISIT: 'project_visit',
  PERSONAL_GROUP: 'personal_group',
};

const API_APPROVAL_TO_APP: Record<ApiTripApprovalStatus, ApprovalStatus> = {
  not_required: 'NOT_REQUIRED',
  pending: 'PENDING',
  approved: 'APPROVED',
  rejected: 'REJECTED',
  changes_requested: 'CHANGES_REQUESTED',
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
  const booking: Booking = {
    ...api,
    startDatetime: api.startDatetime ?? '',
    endDatetime: api.endDatetime ?? '',
  };
  return { ...booking, imageUrl: bookingImageUrl(booking) };
}

function mapDestination(api: ApiDestinationOption): DestinationOption {
  const city = api.city ?? '';
  return {
    ...api,
    city,
    imageUrl: destinationImageUrl({
      imageUrl: api.imageUrl,
      destinationName: api.destinationName,
      city,
      country: api.country,
    }),
  };
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
  private readonly pendingInvitesSignal = signal<ApiPendingInvite[]>([]);
  private readonly tasksSignal = signal<TripTask[]>([]);
  private readonly loadingSignal = signal(false);

  private readonly membersByTrip = signal<Record<string, TripMember[]>>({});
  private readonly availabilityByTrip = signal<Record<string, AvailabilityOption[]>>({});
  private readonly destinationsByTrip = signal<Record<string, DestinationOption[]>>({});
  private readonly itineraryByTrip = signal<Record<string, ItineraryDay[]>>({});
  private readonly bookingsByTrip = signal<Record<string, Booking[]>>({});
  private readonly budgetByTrip = signal<Record<string, BudgetCategory[]>>({});
  private readonly expensesByTrip = signal<Record<string, Expense[]>>({});
  private readonly settlementsByTrip = signal<Record<string, ApiSettlement[]>>({});
  private readonly activityByTrip = signal<Record<string, ApiActivity[]>>({});
  private readonly commentsByTrip = signal<Record<string, ApiComment[]>>({});
  private readonly approvalsByTrip = signal<Record<string, ApiApproval[]>>({});
  private readonly pendingApprovalsSignal = signal<ApiApproval[]>([]);
  private readonly recentActivitySignal = signal<ApiActivity[]>([]);
  private readonly expenseSummarySignal = signal<ApiExpenseSummary>({
    youPaid: 0,
    yourShare: 0,
    youReceive: 0,
    currency: 'INR',
  });
  private readonly myVotesByTrip = signal<Record<string, ApiMyVotes>>({});

  readonly trips = this.tripsSignal.asReadonly();
  readonly loading = this.loadingSignal.asReadonly();
  readonly upcomingTrips = computed(() =>
    this.tripsSignal().filter((t) => !['COMPLETED', 'CANCELLED', 'ARCHIVED'].includes(t.status)),
  );

  constructor() {
    void this.loadTrips();
    void this.loadNotifications();
    void this.loadPendingInvites();
    void this.loadAllTasks();
    void this.loadPendingApprovals();
    void this.loadRecentActivity();
    void this.loadExpenseSummary();
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
      tripType: api.tripType ? API_TYPE_TO_TRIP_TYPE[api.tripType] : 'TEAM_OUTING',
      startDate: api.startDate,
      endDate: api.endDate,
      origin: api.origin ?? '',
      destination: api.destination,
      status: API_STATUS_TO_TRIP_STATUS[api.status],
      approvalStatus: api.approvalStatus
        ? API_APPROVAL_TO_APP[api.approvalStatus]
        : 'NOT_REQUIRED',
      currency: api.currency,
      estimatedBudget: api.budgetCents / 100,
      actualBudget: api.actualCents / 100,
      maxMembers: api.maxMembers ?? 20,
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

  getById(id: string): Trip | undefined {
    return this.tripsSignal().find((t) => t.id === id);
  }

  async createTrip(partial: Partial<Trip> & { approvalRequired?: boolean }): Promise<Trip> {
    const payload: CreateTripPayload = {
      name: partial.title || 'Untitled trip',
      description: partial.description || '',
      destination: partial.destination || '',
      origin: partial.origin || '',
      tripType: partial.tripType ? TRIP_TYPE_TO_API[partial.tripType] : 'team_outing',
      startDate: partial.startDate ?? null,
      endDate: partial.endDate ?? null,
      currency: partial.currency || 'INR',
      budgetCents: Math.round((partial.estimatedBudget || 0) * 100),
      maxMembers: partial.maxMembers ?? null,
      approvalRequired:
        partial.approvalRequired === true || partial.approvalStatus === 'PENDING',
    };
    const apiTrip = await firstValueFrom(this.tripApi.create(payload));
    const trip = this.mapApiTrip(apiTrip);
    this.tripsSignal.update((list) => [trip, ...list]);
    void this.loadPendingApprovals();
    void this.loadRecentActivity();
    return trip;
  }

  async updateTrip(id: string, patch: UpdateTripPayload): Promise<Trip> {
    const apiTrip = await firstValueFrom(this.tripApi.update(id, patch));
    const trip = this.mapApiTrip(apiTrip);
    this.tripsSignal.update((list) => list.map((t) => (t.id === id ? trip : t)));
    void this.loadRecentActivity();
    return trip;
  }

  async deleteTrip(id: string): Promise<void> {
    await firstValueFrom(this.tripApi.delete(id));
    this.tripsSignal.update((list) => list.filter((t) => t.id !== id));
    void this.loadRecentActivity();
  }

  getMembers(tripId: string): TripMember[] {
    return this.membersByTrip()[tripId] ?? [];
  }

  async loadMembers(tripId: string): Promise<void> {
    const members = await firstValueFrom(this.tripApi.members(tripId));
    this.membersByTrip.update((m) => ({ ...m, [tripId]: members.map(mapMember) }));
  }

  async inviteMember(tripId: string, email: string, role?: ApiTripMember['role']): Promise<void> {
    await firstValueFrom(this.tripApi.inviteMember(tripId, { email, role }));
    await this.loadMembers(tripId);
  }

  async removeMember(tripId: string, memberId: string): Promise<void> {
    await firstValueFrom(this.tripApi.removeMember(tripId, memberId));
    await this.loadMembers(tripId);
  }

  async respondToInvite(tripId: string, rsvpStatus: ApiTripMember['rsvpStatus']): Promise<void> {
    await firstValueFrom(this.tripApi.respondToInvite(tripId, rsvpStatus));
    await Promise.all([
      this.loadMembers(tripId),
      this.loadPendingInvites(),
      this.loadNotifications(),
      this.loadTrips(),
    ]);
  }

  getPendingInvites(): ApiPendingInvite[] {
    return this.pendingInvitesSignal();
  }

  async loadPendingInvites(): Promise<void> {
    try {
      const invites = await firstValueFrom(this.tripApi.myInvites());
      this.pendingInvitesSignal.set(invites);
    } catch {
      this.pendingInvitesSignal.set([]);
    }
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
    this.destinationsByTrip.update((d) => ({
      ...d,
      [tripId]: destinations.map(mapDestination),
    }));
  }

  async addDestination(tripId: string, payload: CreateDestinationPayload): Promise<void> {
    const withImage: CreateDestinationPayload = {
      ...payload,
      imageUrl:
        payload.imageUrl?.trim() ||
        destinationImageUrl({
          destinationName: payload.destinationName,
          city: payload.city,
          country: payload.country,
        }),
    };
    await firstValueFrom(this.tripApi.createDestination(tripId, withImage));
    await this.loadDestinations(tripId);
  }

  async addAvailabilityOption(tripId: string, payload: CreateAvailabilityOptionPayload): Promise<void> {
    await firstValueFrom(this.tripApi.createAvailabilityOption(tripId, payload));
    await this.loadAvailability(tripId);
  }

  getMyVotes(tripId: string): ApiMyVotes {
    return this.myVotesByTrip()[tripId] ?? { availability: {}, destinationId: null };
  }

  async loadMyVotes(tripId: string): Promise<void> {
    const votes = await firstValueFrom(this.tripApi.myVotes(tripId));
    this.myVotesByTrip.update((v) => ({ ...v, [tripId]: votes }));
  }

  /** optionId is `${startDate}_${endDate}`, as produced by the availability list endpoint. */
  async castAvailabilityVote(tripId: string, optionId: string, vote: ApiAvailVote): Promise<void> {
    const [startDate, endDate] = optionId.split('_');
    await firstValueFrom(this.tripApi.castAvailabilityVote(tripId, startDate, endDate, vote));
    await Promise.all([this.loadAvailability(tripId), this.loadMyVotes(tripId)]);
  }

  async castDestinationVote(tripId: string, destinationId: string): Promise<void> {
    await firstValueFrom(this.tripApi.castDestinationVote(tripId, destinationId));
    await Promise.all([this.loadDestinations(tripId), this.loadMyVotes(tripId)]);
  }

  getItinerary(tripId: string): ItineraryDay[] {
    return this.itineraryByTrip()[tripId] ?? [];
  }

  async loadItinerary(tripId: string): Promise<void> {
    const days = await firstValueFrom(this.tripApi.itinerary(tripId));
    this.itineraryByTrip.update((i) => ({ ...i, [tripId]: days }));
  }

  async addItineraryItem(tripId: string, payload: CreateItineraryItemPayload): Promise<void> {
    await firstValueFrom(this.tripApi.addItineraryItem(tripId, payload));
    await this.loadItinerary(tripId);
  }

  async deleteItineraryItem(tripId: string, itemId: string): Promise<void> {
    await firstValueFrom(this.tripApi.deleteItineraryItem(tripId, itemId));
    await this.loadItinerary(tripId);
  }

  getBookings(tripId: string): Booking[] {
    return this.bookingsByTrip()[tripId] ?? [];
  }

  async loadBookings(tripId: string): Promise<void> {
    const bookings = await firstValueFrom(this.tripApi.bookings(tripId));
    this.bookingsByTrip.update((b) => ({ ...b, [tripId]: bookings.map(mapBooking) }));
  }

  async addBooking(tripId: string, payload: CreateBookingPayload): Promise<void> {
    await firstValueFrom(this.tripApi.createBooking(tripId, payload));
    await this.loadBookings(tripId);
  }

  async deleteBooking(tripId: string, bookingId: string): Promise<void> {
    await firstValueFrom(this.tripApi.deleteBooking(tripId, bookingId));
    await this.loadBookings(tripId);
  }

  getBudget(tripId: string): BudgetCategory[] {
    return this.budgetByTrip()[tripId] ?? [];
  }

  async loadBudget(tripId: string): Promise<void> {
    const categories = await firstValueFrom(this.tripApi.budget(tripId));
    this.budgetByTrip.update((b) => ({ ...b, [tripId]: categories }));
  }

  async addBudgetCategory(tripId: string, payload: CreateBudgetCategoryPayload): Promise<void> {
    await firstValueFrom(this.tripApi.createBudgetCategory(tripId, payload));
    await this.loadBudget(tripId);
  }

  async updateBudgetCategory(
    tripId: string,
    categoryId: string,
    payload: UpdateBudgetCategoryPayload,
  ): Promise<void> {
    await firstValueFrom(this.tripApi.updateBudgetCategory(tripId, categoryId, payload));
    await this.loadBudget(tripId);
  }

  getExpenses(tripId: string): Expense[] {
    return this.expensesByTrip()[tripId] ?? [];
  }

  async loadExpenses(tripId: string): Promise<void> {
    const expenses = await firstValueFrom(this.tripApi.expenses(tripId));
    this.expensesByTrip.update((e) => ({ ...e, [tripId]: expenses }));
  }

  async addExpense(tripId: string, payload: CreateExpensePayload): Promise<void> {
    await firstValueFrom(this.tripApi.createExpense(tripId, payload));
    await Promise.all([
      this.loadExpenses(tripId),
      this.loadSettlements(tripId),
      this.loadTrips(),
      this.loadExpenseSummary(),
      this.loadRecentActivity(),
    ]);
  }

  async updateExpenseStatus(tripId: string, expenseId: string, status: 'APPROVED' | 'REJECTED'): Promise<void> {
    await firstValueFrom(this.tripApi.updateExpenseStatus(expenseId, status));
    await Promise.all([
      this.loadExpenses(tripId),
      this.loadSettlements(tripId),
      this.loadTrips(),
      this.loadExpenseSummary(),
    ]);
  }

  getSettlements(tripId: string): ApiSettlement[] {
    return this.settlementsByTrip()[tripId] ?? [];
  }

  async loadSettlements(tripId: string): Promise<void> {
    try {
      const settlements = await firstValueFrom(this.tripApi.settlements(tripId));
      this.settlementsByTrip.update((s) => ({ ...s, [tripId]: settlements }));
    } catch {
      this.settlementsByTrip.update((s) => ({ ...s, [tripId]: [] }));
    }
  }

  getTasks(tripId?: string): TripTask[] {
    const all = this.tasksSignal();
    return tripId ? all.filter((t) => t.tripId === tripId) : all;
  }

  /** Cross-trip task board (dashboard + Tasks page): all tasks across the caller's org. */
  async loadAllTasks(): Promise<void> {
    const tasks = await firstValueFrom(this.tripApi.allTasks());
    this.tasksSignal.set(tasks.map(mapTask));
  }

  async createTask(tripId: string, payload: CreateTaskPayload): Promise<void> {
    await firstValueFrom(this.tripApi.createTask(tripId, payload));
    await Promise.all([this.loadAllTasks(), this.loadRecentActivity()]);
  }

  async updateTaskStatus(taskId: string, status: TripTask['status']): Promise<void> {
    this.tasksSignal.update((list) =>
      list.map((t) => (t.id === taskId ? { ...t, status } : t)),
    );
    await firstValueFrom(this.tripApi.updateTaskStatus(taskId, status));
  }

  getApprovals(tripId: string): ApiApproval[] {
    return this.approvalsByTrip()[tripId] ?? [];
  }

  async loadApprovals(tripId: string): Promise<void> {
    try {
      const approvals = await firstValueFrom(this.tripApi.tripApprovals(tripId));
      this.approvalsByTrip.update((a) => ({ ...a, [tripId]: approvals }));
    } catch {
      this.approvalsByTrip.update((a) => ({ ...a, [tripId]: [] }));
    }
  }

  getPendingApprovals(): ApiApproval[] {
    return this.pendingApprovalsSignal();
  }

  async loadPendingApprovals(): Promise<void> {
    try {
      const approvals = await firstValueFrom(this.tripApi.pendingApprovals());
      this.pendingApprovalsSignal.set(approvals);
    } catch {
      this.pendingApprovalsSignal.set([]);
    }
  }

  async reviewApproval(
    approvalId: string,
    status: 'APPROVED' | 'REJECTED',
    tripId?: string,
  ): Promise<void> {
    await firstValueFrom(this.tripApi.reviewApproval(approvalId, status));
    await Promise.all([
      this.loadPendingApprovals(),
      this.loadTrips(),
      this.loadRecentActivity(),
      tripId ? this.loadApprovals(tripId) : Promise.resolve(),
    ]);
  }

  getActivity(tripId: string): ApiActivity[] {
    return this.activityByTrip()[tripId] ?? [];
  }

  async loadActivity(tripId: string): Promise<void> {
    try {
      const activity = await firstValueFrom(this.tripApi.tripActivity(tripId));
      this.activityByTrip.update((a) => ({ ...a, [tripId]: activity }));
    } catch {
      this.activityByTrip.update((a) => ({ ...a, [tripId]: [] }));
    }
  }

  getComments(tripId: string): ApiComment[] {
    return this.commentsByTrip()[tripId] ?? [];
  }

  async loadComments(tripId: string): Promise<void> {
    try {
      const comments = await firstValueFrom(this.tripApi.comments(tripId));
      this.commentsByTrip.update((c) => ({ ...c, [tripId]: comments }));
    } catch {
      this.commentsByTrip.update((c) => ({ ...c, [tripId]: [] }));
    }
  }

  async addComment(tripId: string, payload: CreateCommentPayload): Promise<void> {
    await firstValueFrom(this.tripApi.createComment(tripId, payload));
    await Promise.all([this.loadComments(tripId), this.loadRecentActivity()]);
  }

  async deleteComment(tripId: string, commentId: string): Promise<void> {
    await firstValueFrom(this.tripApi.deleteComment(tripId, commentId));
    await this.loadComments(tripId);
  }

  async loadRecentActivity(): Promise<void> {
    try {
      const activity = await firstValueFrom(this.tripApi.recentActivity());
      this.recentActivitySignal.set(activity);
    } catch {
      this.recentActivitySignal.set([]);
    }
  }

  async loadExpenseSummary(): Promise<void> {
    try {
      const summary = await firstValueFrom(this.tripApi.expenseSummary());
      this.expenseSummarySignal.set(summary);
    } catch {
      this.expenseSummarySignal.set({
        youPaid: 0,
        yourShare: 0,
        youReceive: 0,
        currency: 'INR',
      });
    }
  }

  getNotifications(): AppNotification[] {
    return this.notificationsSignal();
  }

  async loadNotifications(): Promise<void> {
    const notifications = await firstValueFrom(this.notificationApi.list());
    this.notificationsSignal.set(
      notifications.map((n) => ({
        id: n.id,
        title: n.title,
        message: n.message,
        type: n.type,
        read: n.read,
        createdAt: n.createdAt,
        tripId: n.tripId,
        payload: n.payload,
      })),
    );
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
    const summary = this.expenseSummarySignal();
    return {
      upcomingTrips: this.upcomingTrips().slice(0, 4),
      pendingApprovals: this.pendingApprovalsSignal().length,
      myTasks: openTasks,
      expenseSummary: {
        youPaid: summary.youPaid,
        yourShare: summary.yourShare,
        youReceive: summary.youReceive,
      },
      recentActivity: this.recentActivitySignal().map((a) => ({
        id: a.id,
        message: a.message,
        createdAt: a.createdAt,
      })),
    };
  }
}
