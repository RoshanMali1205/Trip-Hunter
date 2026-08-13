export type TripType =
  | 'BUSINESS'
  | 'TEAM_OUTING'
  | 'CORPORATE_OFFSITE'
  | 'TRAINING_CONFERENCE'
  | 'PROJECT_VISIT'
  | 'PERSONAL_GROUP';

export type TripStatus =
  | 'DRAFT'
  | 'PLANNING'
  | 'VOTING'
  | 'PENDING_APPROVAL'
  | 'APPROVED'
  | 'BOOKING'
  | 'UPCOMING'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'REJECTED'
  | 'CANCELLED'
  | 'ARCHIVED';

export type ApprovalStatus =
  | 'NOT_REQUIRED'
  | 'PENDING'
  | 'APPROVED'
  | 'REJECTED'
  | 'CHANGES_REQUESTED';

export interface Trip {
  id: string;
  organizationId: string;
  title: string;
  description: string;
  tripType: TripType;
  startDate: string | null;
  endDate: string | null;
  origin: string;
  destination: string;
  status: TripStatus;
  approvalStatus: ApprovalStatus;
  currency: string;
  estimatedBudget: number;
  actualBudget: number;
  maxMembers: number;
  memberCount: number;
  organizerId: string;
  organizerName: string;
  coverImageUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface TripMember {
  id: string;
  tripId: string;
  userId: string;
  name: string;
  email: string;
  avatarUrl?: string;
  role: 'ORGANIZER' | 'MEMBER' | 'VIEWER';
  inviteStatus: 'INVITED' | 'ACCEPTED' | 'DECLINED' | 'MAYBE';
  attendanceStatus: 'PENDING' | 'CONFIRMED' | 'DECLINED';
}

export interface AvailabilityOption {
  id: string;
  tripId: string;
  startDate: string;
  endDate: string;
  availableCount: number;
  maybeCount: number;
  notAvailableCount: number;
  totalVotes: number;
}

export interface DestinationOption {
  id: string;
  tripId: string;
  destinationName: string;
  city: string;
  country: string;
  description: string;
  estimatedCost: number;
  voteCount: number;
  imageUrl?: string;
}

export interface ItineraryItem {
  id: string;
  dayId: string;
  title: string;
  description: string;
  type: 'TRAVEL' | 'HOTEL' | 'FOOD' | 'ACTIVITY' | 'MEETING' | 'FREE_TIME' | 'OTHER';
  startTime: string;
  endTime: string;
  locationName: string;
  sortOrder: number;
}

export interface ItineraryDay {
  id: string;
  tripId: string;
  date: string;
  title: string;
  notes: string;
  sortOrder: number;
  items: ItineraryItem[];
}

export interface Booking {
  id: string;
  tripId: string;
  bookingType: 'FLIGHT' | 'TRAIN' | 'BUS' | 'HOTEL' | 'CAB' | 'ACTIVITY' | 'RESTAURANT' | 'OTHER';
  provider: string;
  bookingReference: string;
  confirmationNumber: string;
  startDatetime: string;
  endDatetime: string;
  amount: number;
  currency: string;
  status: 'CONFIRMED' | 'PENDING' | 'CANCELLED';
  /** Optional cover for photo-first booking cards (hotel/bus/etc.). */
  imageUrl?: string;
}

export interface BudgetCategory {
  id: string;
  tripId: string;
  category: string;
  plannedAmount: number;
  actualAmount: number;
  currency: string;
}

export interface Expense {
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

export interface TripTask {
  id: string;
  tripId: string;
  title: string;
  description: string;
  assignedTo: string;
  assignedToName: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  status: 'TODO' | 'IN_PROGRESS' | 'BLOCKED' | 'COMPLETED';
  dueDate: string;
}

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  type: string;
  read: boolean;
  createdAt: string;
  tripId?: string | null;
  payload?: Record<string, unknown>;
}

export interface DashboardSummary {
  upcomingTrips: Trip[];
  pendingApprovals: number;
  myTasks: TripTask[];
  expenseSummary: {
    youPaid: number;
    yourShare: number;
    youReceive: number;
  };
  recentActivity: { id: string; message: string; createdAt: string }[];
}
