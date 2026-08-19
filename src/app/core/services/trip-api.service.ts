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

export type ApiTripType =
  | 'business'
  | 'team_outing'
  | 'corporate_offsite'
  | 'training_conference'
  | 'project_visit'
  | 'personal_group';

export type ApiTripApprovalStatus =
  | 'not_required'
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'changes_requested';

export interface ApiTrip {
  id: string;
  organizationId: string;
  teamId: string | null;
  name: string;
  description: string;
  destination: string;
  origin?: string;
  tripType?: ApiTripType;
  status: ApiTripStatus;
  approvalStatus?: ApiTripApprovalStatus;
  startDate: string | null;
  endDate: string | null;
  budgetCents: number;
  actualCents: number;
  currency: string;
  maxMembers?: number | null;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTripPayload {
  name: string;
  description?: string;
  destination?: string;
  origin?: string;
  tripType?: ApiTripType;
  startDate?: string | null;
  endDate?: string | null;
  currency?: string;
  budgetCents?: number;
  maxMembers?: number | null;
  approvalRequired?: boolean;
  teamId?: string | null;
}

export interface UpdateTripPayload {
  name?: string;
  description?: string;
  destination?: string;
  origin?: string;
  tripType?: ApiTripType;
  status?: ApiTripStatus;
  approvalStatus?: ApiTripApprovalStatus;
  startDate?: string | null;
  endDate?: string | null;
  currency?: string;
  budgetCents?: number;
  maxMembers?: number | null;
  teamId?: string | null;
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
  pendingSignup?: boolean;
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
  isSelected?: boolean;
}

export interface ApiDestinationOption {
  id: string;
  tripId: string;
  destinationName: string;
  city: string;
  country: string;
  description: string;
  estimatedCost: number;
  voteCount: number;
  imageUrl?: string;
  isSelected?: boolean;
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

export interface UpdateItineraryItemPayload {
  title?: string;
  description?: string;
  type?: ApiItineraryItem['type'];
  date?: string;
  startTime?: string;
  endTime?: string;
  locationName?: string;
}

export interface UpdateBookingPayload {
  bookingType?: ApiBooking['bookingType'];
  provider?: string;
  bookingReference?: string;
  amount?: number;
  currency?: string;
  startDatetime?: string | null;
  endDatetime?: string | null;
  status?: ApiBooking['status'];
}

export interface CreateDestinationPayload {
  destinationName: string;
  city?: string;
  country?: string;
  description?: string;
  estimatedCost?: number;
  imageUrl?: string;
}

export interface CreateAvailabilityOptionPayload {
  startDate: string;
  endDate: string;
  label?: string;
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

export interface CreateTaskPayload {
  title: string;
  description?: string;
  priority?: ApiTripTask['priority'];
  assignedTo?: string | null;
  dueDate?: string | null;
}

export interface ApiApproval {
  id: string;
  tripId: string;
  tripName: string;
  subjectType: 'expense' | 'booking' | 'budget' | 'trip';
  subjectId: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';
  requestedBy: string | null;
  requestedByName: string;
  reviewedBy: string | null;
  reviewedAt: string | null;
  notes: string;
  createdAt: string;
}

export interface ApiSettlement {
  fromUserId: string;
  fromName: string;
  toUserId: string;
  toName: string;
  amount: number;
  currency: string;
  message: string;
  tripId?: string;
  tripName?: string;
  paid: boolean;
}

export interface ApiExpenseSummary {
  youPaid: number;
  yourShare: number;
  youReceive: number;
  currency: string;
}

export interface ApiActivity {
  id: string;
  organizationId: string | null;
  tripId: string | null;
  actorId: string | null;
  actorName: string;
  action: string;
  entityType: string;
  entityId: string | null;
  message: string;
  createdAt: string;
}

export type ApiDocumentType = 'itinerary' | 'receipt' | 'ticket' | 'policy' | 'other';

export interface ApiDocument {
  id: string;
  tripId: string;
  title: string;
  docType: ApiDocumentType;
  storagePath: string;
  mimeType: string;
  sizeBytes: number;
  url: string;
  uploadedBy: string | null;
  uploadedByName: string;
  createdAt: string;
}

export interface CreateDocumentPayload {
  title: string;
  docType?: ApiDocumentType;
  fileName: string;
  mimeType: string;
  contentBase64: string;
}

export interface ApiComment {
  id: string;
  tripId: string;
  subjectType: 'trip' | 'task' | 'expense' | 'booking' | 'document' | 'itinerary';
  subjectId: string | null;
  parentId: string | null;
  body: string;
  authorId: string;
  authorName: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCommentPayload {
  body: string;
  subjectType?: ApiComment['subjectType'];
  subjectId?: string | null;
  parentId?: string | null;
}

export interface ApiTeamMember {
  id: string;
  teamId: string;
  userId: string;
  name: string;
  email: string;
  role: 'lead' | 'member';
}

export interface ApiTeam {
  id: string;
  organizationId: string;
  name: string;
  description: string;
  createdBy: string | null;
  memberCount: number;
  createdAt: string;
  members?: ApiTeamMember[];
}

export interface ApiOrgPerson {
  id: string;
  name: string;
  email: string;
  role: string;
}

@Injectable({ providedIn: 'root' })
export class TripApiService {
  private readonly http = inject(HttpClient);
  private readonly base = `${getAppConfig().apiBaseUrl}/trips`;
  private readonly api = getAppConfig().apiBaseUrl;

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

  update(id: string, payload: UpdateTripPayload): Observable<ApiTrip> {
    return this.http
      .patch<ApiEnvelope<ApiTrip>>(`${this.base}/${id}`, payload)
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

  removeMember(tripId: string, memberId: string): Observable<void> {
    return this.http
      .delete<ApiEnvelope<null>>(`${this.base}/${tripId}/members/${memberId}`)
      .pipe(map(() => undefined));
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

  createAvailabilityOption(
    tripId: string,
    payload: CreateAvailabilityOptionPayload,
  ): Observable<ApiAvailabilityOption> {
    return this.http
      .post<ApiEnvelope<ApiAvailabilityOption>>(`${this.base}/${tripId}/availability`, payload)
      .pipe(map((res) => res.data));
  }

  destinations(tripId: string): Observable<ApiDestinationOption[]> {
    return this.http
      .get<ApiEnvelope<ApiDestinationOption[]>>(`${this.base}/${tripId}/destinations`)
      .pipe(map((res) => res.data));
  }

  createDestination(tripId: string, payload: CreateDestinationPayload): Observable<ApiDestinationOption> {
    return this.http
      .post<ApiEnvelope<ApiDestinationOption>>(`${this.base}/${tripId}/destinations`, payload)
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

  updateItineraryItem(tripId: string, itemId: string, payload: UpdateItineraryItemPayload): Observable<void> {
    return this.http
      .patch<ApiEnvelope<null>>(`${this.base}/${tripId}/itinerary/${itemId}`, payload)
      .pipe(map(() => undefined));
  }

  deleteItineraryItem(tripId: string, itemId: string): Observable<void> {
    return this.http
      .delete<ApiEnvelope<null>>(`${this.base}/${tripId}/itinerary/${itemId}`)
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

  updateBooking(tripId: string, bookingId: string, payload: UpdateBookingPayload): Observable<ApiBooking> {
    return this.http
      .patch<ApiEnvelope<ApiBooking>>(`${this.base}/${tripId}/bookings/${bookingId}`, payload)
      .pipe(map((res) => res.data));
  }

  deleteBooking(tripId: string, bookingId: string): Observable<void> {
    return this.http
      .delete<ApiEnvelope<null>>(`${this.base}/${tripId}/bookings/${bookingId}`)
      .pipe(map(() => undefined));
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

  deleteBudgetCategory(tripId: string, categoryId: string): Observable<void> {
    return this.http
      .delete<ApiEnvelope<null>>(`${this.base}/${tripId}/budget/${categoryId}`)
      .pipe(map(() => undefined));
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
      .patch<ApiEnvelope<ApiExpense>>(`${this.api}/expenses/${expenseId}`, { status })
      .pipe(map((res) => res.data));
  }

  settlements(tripId: string): Observable<ApiSettlement[]> {
    return this.http
      .get<ApiEnvelope<ApiSettlement[]>>(`${this.base}/${tripId}/settlements`)
      .pipe(map((res) => res.data));
  }

  mySettlements(): Observable<ApiSettlement[]> {
    return this.http
      .get<ApiEnvelope<ApiSettlement[]>>(`${this.api}/me/settlements`)
      .pipe(map((res) => res.data));
  }

  markSettlementPaid(
    tripId: string,
    fromUserId: string,
    toUserId: string,
  ): Observable<ApiSettlement[]> {
    return this.http
      .post<ApiEnvelope<ApiSettlement[]>>(`${this.base}/${tripId}/settlements/pay`, {
        fromUserId,
        toUserId,
      })
      .pipe(map((res) => res.data));
  }

  expenseSummary(): Observable<ApiExpenseSummary> {
    return this.http
      .get<ApiEnvelope<ApiExpenseSummary>>(`${this.api}/me/expense-summary`)
      .pipe(map((res) => res.data));
  }

  tasks(tripId: string): Observable<ApiTripTask[]> {
    return this.http
      .get<ApiEnvelope<ApiTripTask[]>>(`${this.base}/${tripId}/tasks`)
      .pipe(map((res) => res.data));
  }

  createTask(tripId: string, payload: CreateTaskPayload): Observable<ApiTripTask> {
    return this.http
      .post<ApiEnvelope<ApiTripTask>>(`${this.base}/${tripId}/tasks`, payload)
      .pipe(map((res) => res.data));
  }

  allTasks(): Observable<ApiTripTask[]> {
    return this.http
      .get<ApiEnvelope<ApiTripTask[]>>(`${this.api}/tasks`)
      .pipe(map((res) => res.data));
  }

  updateTask(
    taskId: string,
    patch: { status?: ApiTripTask['status']; assignedTo?: string | null },
  ): Observable<ApiTripTask> {
    return this.http
      .patch<ApiEnvelope<ApiTripTask>>(`${this.api}/tasks/${taskId}`, patch)
      .pipe(map((res) => res.data));
  }

  updateTaskStatus(taskId: string, status: ApiTripTask['status']): Observable<ApiTripTask> {
    return this.updateTask(taskId, { status });
  }

  tripApprovals(tripId: string): Observable<ApiApproval[]> {
    return this.http
      .get<ApiEnvelope<ApiApproval[]>>(`${this.base}/${tripId}/approvals`)
      .pipe(map((res) => res.data));
  }

  pendingApprovals(): Observable<ApiApproval[]> {
    return this.http
      .get<ApiEnvelope<ApiApproval[]>>(`${this.api}/me/approvals`)
      .pipe(map((res) => res.data));
  }

  reviewApproval(
    approvalId: string,
    status: 'APPROVED' | 'REJECTED',
    notes?: string,
  ): Observable<ApiApproval> {
    return this.http
      .patch<ApiEnvelope<ApiApproval>>(`${this.api}/approvals/${approvalId}`, { status, notes })
      .pipe(map((res) => res.data));
  }

  tripActivity(tripId: string): Observable<ApiActivity[]> {
    return this.http
      .get<ApiEnvelope<ApiActivity[]>>(`${this.base}/${tripId}/activity`)
      .pipe(map((res) => res.data));
  }

  recentActivity(): Observable<ApiActivity[]> {
    return this.http
      .get<ApiEnvelope<ApiActivity[]>>(`${this.api}/me/activity`)
      .pipe(map((res) => res.data));
  }

  documents(tripId: string): Observable<ApiDocument[]> {
    return this.http
      .get<ApiEnvelope<ApiDocument[]>>(`${this.base}/${tripId}/documents`)
      .pipe(map((res) => res.data));
  }

  createDocument(tripId: string, payload: CreateDocumentPayload): Observable<ApiDocument> {
    return this.http
      .post<ApiEnvelope<ApiDocument>>(`${this.base}/${tripId}/documents`, payload)
      .pipe(map((res) => res.data));
  }

  deleteDocument(tripId: string, documentId: string): Observable<void> {
    return this.http
      .delete<ApiEnvelope<null>>(`${this.base}/${tripId}/documents/${documentId}`)
      .pipe(map(() => undefined));
  }

  comments(tripId: string): Observable<ApiComment[]> {
    return this.http
      .get<ApiEnvelope<ApiComment[]>>(`${this.base}/${tripId}/comments`)
      .pipe(map((res) => res.data));
  }

  createComment(tripId: string, payload: CreateCommentPayload): Observable<ApiComment> {
    return this.http
      .post<ApiEnvelope<ApiComment>>(`${this.base}/${tripId}/comments`, payload)
      .pipe(map((res) => res.data));
  }

  deleteComment(tripId: string, commentId: string): Observable<void> {
    return this.http
      .delete<ApiEnvelope<null>>(`${this.base}/${tripId}/comments/${commentId}`)
      .pipe(map(() => undefined));
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

  selectDestination(tripId: string, destinationId: string): Observable<ApiDestinationOption> {
    return this.http
      .post<ApiEnvelope<ApiDestinationOption>>(
        `${this.base}/${tripId}/destinations/${destinationId}/select`,
        {},
      )
      .pipe(map((res) => res.data));
  }

  selectAvailabilityOption(
    tripId: string,
    startDate: string,
    endDate: string,
  ): Observable<ApiAvailabilityOption> {
    return this.http
      .post<ApiEnvelope<ApiAvailabilityOption>>(`${this.base}/${tripId}/availability/select`, {
        startDate,
        endDate,
      })
      .pipe(map((res) => res.data));
  }

  listTeams(): Observable<ApiTeam[]> {
    return this.http
      .get<ApiEnvelope<ApiTeam[]>>(`${this.api}/teams`)
      .pipe(map((res) => res.data));
  }

  getTeam(teamId: string): Observable<ApiTeam> {
    return this.http
      .get<ApiEnvelope<ApiTeam>>(`${this.api}/teams/${teamId}`)
      .pipe(map((res) => res.data));
  }

  createTeam(payload: { name: string; description?: string }): Observable<ApiTeam> {
    return this.http
      .post<ApiEnvelope<ApiTeam>>(`${this.api}/teams`, payload)
      .pipe(map((res) => res.data));
  }

  deleteTeam(teamId: string): Observable<void> {
    return this.http
      .delete<ApiEnvelope<null>>(`${this.api}/teams/${teamId}`)
      .pipe(map(() => undefined));
  }

  addTeamMember(
    teamId: string,
    payload: { email: string; role?: ApiTeamMember['role'] },
  ): Observable<ApiTeamMember> {
    return this.http
      .post<ApiEnvelope<ApiTeamMember>>(`${this.api}/teams/${teamId}/members`, payload)
      .pipe(map((res) => res.data));
  }

  removeTeamMember(teamId: string, memberId: string): Observable<void> {
    return this.http
      .delete<ApiEnvelope<null>>(`${this.api}/teams/${teamId}/members/${memberId}`)
      .pipe(map(() => undefined));
  }

  orgPeople(): Observable<ApiOrgPerson[]> {
    return this.http
      .get<ApiEnvelope<ApiOrgPerson[]>>(`${this.api}/org/members`)
      .pipe(map((res) => res.data));
  }
}
