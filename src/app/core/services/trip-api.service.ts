import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { getAppConfig } from '../config/app-config';

export type ApiTripStatus =
  | 'draft'
  | 'planning'
  | 'confirmed'
  | 'in_progress'
  | 'completed'
  | 'cancelled';

export interface ApiTrip {
  id: string;
  organizationId: string;
  teamId: string | null;
  name: string;
  description: string;
  destination: string;
  status: ApiTripStatus;
  startDate: string | null;
  endDate: string | null;
  budgetCents: number;
  actualCents: number;
  currency: string;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTripPayload {
  name: string;
  description?: string;
  destination?: string;
  startDate?: string | null;
  endDate?: string | null;
  currency?: string;
  budgetCents?: number;
}

export interface ApiEnvelope<T> {
  success: boolean;
  data: T;
  message?: string;
}

export interface ApiTripMember {
  id: string;
  tripId: string;
  userId: string;
  name: string;
  email: string;
  avatarUrl: string | null;
  role: 'organizer' | 'traveler' | 'viewer';
  rsvpStatus: 'pending' | 'accepted' | 'declined' | 'maybe';
}

export interface ApiAvailabilityOption {
  id: string;
  tripId: string;
  startDate: string;
  endDate: string;
  availableCount: number;
  maybeCount: number;
  notAvailableCount: number;
  totalVotes: number;
}

export interface ApiDestinationOption {
  id: string;
  tripId: string;
  destinationName: string;
  country: string;
  description: string;
  estimatedCost: number;
  voteCount: number;
  imageUrl?: string;
}

export interface ApiItineraryItem {
  id: string;
  dayId: string;
  title: string;
  description: string;
  type: 'TRAVEL' | 'HOTEL' | 'FOOD' | 'ACTIVITY' | 'MEETING' | 'OTHER';
  startTime: string;
  endTime: string;
  locationName: string;
  sortOrder: number;
}

export interface ApiItineraryDay {
  id: string;
  tripId: string;
  date: string;
  title: string;
  notes: string;
  sortOrder: number;
  items: ApiItineraryItem[];
}

export interface ApiBooking {
  id: string;
  tripId: string;
  bookingType: 'FLIGHT' | 'TRAIN' | 'BUS' | 'HOTEL' | 'CAB' | 'ACTIVITY' | 'RESTAURANT' | 'OTHER';
  provider: string;
  bookingReference: string;
  confirmationNumber: string;
  startDatetime: string | null;
  endDatetime: string | null;
  amount: number;
  currency: string;
  status: 'CONFIRMED' | 'PENDING' | 'CANCELLED';
}

export interface ApiBudgetCategory {
  id: string;
  tripId: string;
  category: string;
  plannedAmount: number;
  actualAmount: number;
  currency: string;
}

export interface ApiExpense {
  id: string;
  tripId: string;
  paidBy: string;
  paidByName: string;
  category: string;
  description: string;
  amount: number;
  currency: string;
  expenseDate: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
}

export interface ApiTripTask {
  id: string;
  tripId: string;
  title: string;
  description: string;
  assignedTo: string;
  assignedToName: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  status: 'TODO' | 'IN_PROGRESS' | 'BLOCKED' | 'COMPLETED';
  dueDate: string | null;
}

export type ApiAvailVote = 'available' | 'maybe' | 'not';

export interface ApiMyVotes {
  availability: Record<string, ApiAvailVote>;
  destinationId: string | null;
}

export interface InviteMemberPayload {
  email: string;
  role?: 'organizer' | 'traveler' | 'viewer';
}

export interface ApiPendingInvite {
  tripId: string;
  tripName: string;
  destination: string;
  role: 'organizer' | 'traveler' | 'viewer';
  rsvpStatus: 'pending' | 'accepted' | 'declined' | 'maybe';
  invitedAt: string;
}

export interface CreateItineraryItemPayload {
  title: string;
  description?: string;
  type: ApiItineraryItem['type'];
  date: string;
  startTime?: string;
  endTime?: string;
  locationName?: string;
}

export interface CreateBudgetCategoryPayload {
  category: string;
  plannedAmount: number;
  currency?: string;
}

export interface UpdateBudgetCategoryPayload {
  plannedAmount?: number;
  actualAmount?: number;
}

export type ExpenseCategory = 'travel' | 'lodging' | 'food' | 'activity' | 'supplies' | 'other';

export interface CreateExpensePayload {
  description: string;
  category: ExpenseCategory;
  amount: number;
  currency?: string;
  expenseDate?: string;
}

export type CreateBookingType =
  | 'FLIGHT'
  | 'TRAIN'
  | 'BUS'
  | 'HOTEL'
  | 'CAB'
  | 'ACTIVITY'
  | 'OTHER';

export interface CreateBookingPayload {
  bookingType: CreateBookingType;
  provider: string;
  bookingReference?: string;
  amount: number;
  currency?: string;
  startDatetime?: string;
  endDatetime?: string;
}

@Injectable({ providedIn: 'root' })
export class TripApiService {
  private readonly http = inject(HttpClient);
  private readonly base = `${getAppConfig().apiBaseUrl}/trips`;

  list(): Observable<ApiTrip[]> {
    return this.http
      .get<ApiEnvelope<ApiTrip[]>>(this.base)
      .pipe(map((res) => res.data));
  }

  getById(id: string): Observable<ApiTrip> {
    return this.http
      .get<ApiEnvelope<ApiTrip>>(`${this.base}/${id}`)
      .pipe(map((res) => res.data));
  }

  create(payload: CreateTripPayload): Observable<ApiTrip> {
    return this.http
      .post<ApiEnvelope<ApiTrip>>(this.base, payload)
      .pipe(map((res) => res.data));
  }

  delete(id: string): Observable<void> {
    return this.http
      .delete<ApiEnvelope<null>>(`${this.base}/${id}`)
      .pipe(map(() => undefined));
  }

  members(tripId: string): Observable<ApiTripMember[]> {
    return this.http
      .get<ApiEnvelope<ApiTripMember[]>>(`${this.base}/${tripId}/members`)
      .pipe(map((res) => res.data));
  }

  inviteMember(tripId: string, payload: InviteMemberPayload): Observable<ApiTripMember> {
    return this.http
      .post<ApiEnvelope<ApiTripMember>>(`${this.base}/${tripId}/members`, payload)
      .pipe(map((res) => res.data));
  }

  respondToInvite(tripId: string, rsvpStatus: ApiTripMember['rsvpStatus']): Observable<ApiTripMember> {
    return this.http
      .patch<ApiEnvelope<ApiTripMember>>(`${this.base}/${tripId}/members/me`, { rsvpStatus })
      .pipe(map((res) => res.data));
  }

  myInvites(): Observable<ApiPendingInvite[]> {
    return this.http
      .get<ApiEnvelope<ApiPendingInvite[]>>(`${getAppConfig().apiBaseUrl}/me/invites`)
      .pipe(map((res) => res.data));
  }

  availability(tripId: string): Observable<ApiAvailabilityOption[]> {
    return this.http
      .get<ApiEnvelope<ApiAvailabilityOption[]>>(`${this.base}/${tripId}/availability`)
      .pipe(map((res) => res.data));
  }

  destinations(tripId: string): Observable<ApiDestinationOption[]> {
    return this.http
      .get<ApiEnvelope<ApiDestinationOption[]>>(`${this.base}/${tripId}/destinations`)
      .pipe(map((res) => res.data));
  }

  itinerary(tripId: string): Observable<ApiItineraryDay[]> {
    return this.http
      .get<ApiEnvelope<ApiItineraryDay[]>>(`${this.base}/${tripId}/itinerary`)
      .pipe(map((res) => res.data));
  }

  addItineraryItem(tripId: string, payload: CreateItineraryItemPayload): Observable<void> {
    return this.http
      .post<ApiEnvelope<null>>(`${this.base}/${tripId}/itinerary`, payload)
      .pipe(map(() => undefined));
  }

  bookings(tripId: string): Observable<ApiBooking[]> {
    return this.http
      .get<ApiEnvelope<ApiBooking[]>>(`${this.base}/${tripId}/bookings`)
      .pipe(map((res) => res.data));
  }

  createBooking(tripId: string, payload: CreateBookingPayload): Observable<ApiBooking> {
    return this.http
      .post<ApiEnvelope<ApiBooking>>(`${this.base}/${tripId}/bookings`, payload)
      .pipe(map((res) => res.data));
  }

  budget(tripId: string): Observable<ApiBudgetCategory[]> {
    return this.http
      .get<ApiEnvelope<ApiBudgetCategory[]>>(`${this.base}/${tripId}/budget`)
      .pipe(map((res) => res.data));
  }

  createBudgetCategory(tripId: string, payload: CreateBudgetCategoryPayload): Observable<ApiBudgetCategory> {
    return this.http
      .post<ApiEnvelope<ApiBudgetCategory>>(`${this.base}/${tripId}/budget`, payload)
      .pipe(map((res) => res.data));
  }

  updateBudgetCategory(
    tripId: string,
    categoryId: string,
    payload: UpdateBudgetCategoryPayload,
  ): Observable<ApiBudgetCategory> {
    return this.http
      .patch<ApiEnvelope<ApiBudgetCategory>>(`${this.base}/${tripId}/budget/${categoryId}`, payload)
      .pipe(map((res) => res.data));
  }

  expenses(tripId: string): Observable<ApiExpense[]> {
    return this.http
      .get<ApiEnvelope<ApiExpense[]>>(`${this.base}/${tripId}/expenses`)
      .pipe(map((res) => res.data));
  }

  createExpense(tripId: string, payload: CreateExpensePayload): Observable<ApiExpense> {
    return this.http
      .post<ApiEnvelope<ApiExpense>>(`${this.base}/${tripId}/expenses`, payload)
      .pipe(map((res) => res.data));
  }

  updateExpenseStatus(expenseId: string, status: 'APPROVED' | 'REJECTED'): Observable<ApiExpense> {
    return this.http
      .patch<ApiEnvelope<ApiExpense>>(`${getAppConfig().apiBaseUrl}/expenses/${expenseId}`, { status })
      .pipe(map((res) => res.data));
  }

  tasks(tripId: string): Observable<ApiTripTask[]> {
    return this.http
      .get<ApiEnvelope<ApiTripTask[]>>(`${this.base}/${tripId}/tasks`)
      .pipe(map((res) => res.data));
  }

  allTasks(): Observable<ApiTripTask[]> {
    return this.http
      .get<ApiEnvelope<ApiTripTask[]>>(`${getAppConfig().apiBaseUrl}/tasks`)
      .pipe(map((res) => res.data));
  }

  updateTaskStatus(taskId: string, status: ApiTripTask['status']): Observable<ApiTripTask> {
    return this.http
      .patch<ApiEnvelope<ApiTripTask>>(`${getAppConfig().apiBaseUrl}/tasks/${taskId}`, { status })
      .pipe(map((res) => res.data));
  }

  myVotes(tripId: string): Observable<ApiMyVotes> {
    return this.http
      .get<ApiEnvelope<ApiMyVotes>>(`${this.base}/${tripId}/votes/me`)
      .pipe(map((res) => res.data));
  }

  castAvailabilityVote(
    tripId: string,
    startDate: string,
    endDate: string,
    vote: ApiAvailVote,
  ): Observable<void> {
    return this.http
      .post<ApiEnvelope<null>>(`${this.base}/${tripId}/availability/vote`, { startDate, endDate, vote })
      .pipe(map(() => undefined));
  }

  castDestinationVote(tripId: string, destinationId: string): Observable<void> {
    return this.http
      .post<ApiEnvelope<null>>(`${this.base}/${tripId}/destinations/${destinationId}/vote`, {})
      .pipe(map(() => undefined));
  }
}
