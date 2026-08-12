import { Injectable, computed, signal } from '@angular/core';
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
  TripTask,
  AppNotification,
} from '../models/trip.model';
import {
  MOCK_AVAILABILITY,
  MOCK_BOOKINGS,
  MOCK_BUDGET,
  MOCK_DASHBOARD,
  MOCK_DESTINATIONS,
  MOCK_EXPENSES,
  MOCK_ITINERARY,
  MOCK_MEMBERS,
  MOCK_NOTIFICATIONS,
  MOCK_TASKS,
  MOCK_TRIPS,
} from '../data/mock-data';

@Injectable({ providedIn: 'root' })
export class TripStore {
  private readonly tripsSignal = signal<Trip[]>(MOCK_TRIPS);
  private readonly loadingSignal = signal(false);

  readonly trips = this.tripsSignal.asReadonly();
  readonly loading = this.loadingSignal.asReadonly();
  readonly upcomingTrips = computed(() =>
    this.tripsSignal().filter((t) => !['COMPLETED', 'CANCELLED', 'ARCHIVED'].includes(t.status)),
  );

  getById(id: string): Trip | undefined {
    return this.tripsSignal().find((t) => t.id === id);
  }

  createTrip(partial: Partial<Trip>): Trip {
    const trip: Trip = {
      id: `trip-${Date.now()}`,
      organizationId: 'org-1',
      title: partial.title || 'Untitled trip',
      description: partial.description || '',
      tripType: partial.tripType || 'TEAM_OUTING',
      startDate: partial.startDate ?? null,
      endDate: partial.endDate ?? null,
      origin: partial.origin || '',
      destination: partial.destination || '',
      status: 'DRAFT',
      approvalStatus: partial.approvalStatus || 'NOT_REQUIRED',
      currency: partial.currency || 'INR',
      estimatedBudget: partial.estimatedBudget || 0,
      actualBudget: 0,
      maxMembers: partial.maxMembers || 20,
      memberCount: partial.memberCount || 1,
      organizerId: 'user-roshan',
      organizerName: 'Roshan Mali',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
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
    return tripId ? MOCK_TASKS.filter((t) => t.tripId === tripId) : MOCK_TASKS;
  }

  getNotifications(): AppNotification[] {
    return MOCK_NOTIFICATIONS;
  }

  getDashboard(): DashboardSummary {
    return {
      ...MOCK_DASHBOARD,
      upcomingTrips: this.upcomingTrips().slice(0, 3),
    };
  }
}
