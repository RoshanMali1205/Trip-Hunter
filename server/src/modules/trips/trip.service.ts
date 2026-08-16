import { AppError } from '../../middleware/error-handler.js';
import { recordActivity } from '../activity/activity.repository.js';
import { ApprovalRepository } from '../approvals/approval.repository.js';
import {
  TripRepository,
  type Trip,
  type TripApprovalStatus,
  type TripStatus,
  type TripType,
  type UpdateTripInput,
} from './trip.repository.js';

export interface CreateTripRequest {
  organizationId?: string;
  name: string;
  description?: string;
  destination?: string;
  origin?: string;
  tripType?: TripType;
  startDate?: string | null;
  endDate?: string | null;
  currency?: string;
  budgetCents?: number;
  maxMembers?: number | null;
  approvalRequired?: boolean;
  createdBy: string | null;
  createdByName?: string;
}

export class TripService {
  constructor(
    private readonly repo = new TripRepository(),
    private readonly approvals = new ApprovalRepository(),
  ) {}

  listTrips(organizationId?: string, userId?: string): Promise<Trip[]> {
    if (userId) {
      return this.repo.findVisibleToUser(userId, organizationId);
    }
    if (organizationId) {
      return this.repo.findByOrganization(organizationId);
    }
    return this.repo.findAll();
  }

  async getTrip(id: string): Promise<Trip> {
    const trip = await this.repo.findById(id);
    if (!trip) {
      throw new AppError(404, 'TRIP_NOT_FOUND', `Trip ${id} was not found`);
    }
    return trip;
  }

  async createTrip(input: CreateTripRequest): Promise<Trip> {
    if (!input.organizationId) {
      throw new AppError(
        400,
        'ORGANIZATION_REQUIRED',
        'An active organization membership is required to create a trip',
      );
    }

    const approvalStatus: TripApprovalStatus = input.approvalRequired
      ? 'pending'
      : 'not_required';

    const trip = await this.repo.create({
      organizationId: input.organizationId,
      name: input.name,
      description: input.description ?? '',
      destination: input.destination ?? '',
      origin: input.origin ?? '',
      tripType: input.tripType ?? 'team_outing',
      startDate: input.startDate ?? null,
      endDate: input.endDate ?? null,
      currency: input.currency ?? 'INR',
      budgetCents: input.budgetCents ?? 0,
      maxMembers: input.maxMembers ?? null,
      approvalStatus,
      createdBy: input.createdBy,
    });

    if (input.approvalRequired) {
      await this.approvals.createTripApproval({
        tripId: trip.id,
        tripName: trip.name,
        organizationId: trip.organizationId,
        requestedBy: input.createdBy,
        requestedByName: input.createdByName,
      });
    }

    await recordActivity({
      organizationId: trip.organizationId,
      tripId: trip.id,
      actorId: input.createdBy,
      actorName: input.createdByName,
      action: 'created',
      entityType: 'trip',
      entityId: trip.id,
      message: `${input.createdByName ?? 'Someone'} created ${trip.name}`,
    });

    return trip;
  }

  async updateTrip(
    id: string,
    input: UpdateTripInput,
    actor?: { id: string; name?: string },
  ): Promise<Trip> {
    await this.getTrip(id);
    const trip = await this.repo.update(id, input);
    await recordActivity({
      organizationId: trip.organizationId,
      tripId: trip.id,
      actorId: actor?.id ?? null,
      actorName: actor?.name,
      action: 'updated',
      entityType: 'trip',
      entityId: trip.id,
      message: `${actor?.name ?? 'Someone'} updated ${trip.name}`,
    });
    return trip;
  }

  async deleteTrip(id: string, requesterId: string, requesterName?: string): Promise<void> {
    const trip = await this.getTrip(id);
    if (trip.createdBy !== requesterId) {
      throw new AppError(403, 'FORBIDDEN', 'Only the trip owner can delete this trip');
    }
    await this.repo.delete(id);
    await recordActivity({
      organizationId: trip.organizationId,
      tripId: trip.id,
      actorId: requesterId,
      actorName: requesterName,
      action: 'deleted',
      entityType: 'trip',
      entityId: trip.id,
      message: `${requesterName ?? 'Someone'} deleted ${trip.name}`,
    });
  }
}

export type { TripStatus, TripType, TripApprovalStatus, UpdateTripInput };
