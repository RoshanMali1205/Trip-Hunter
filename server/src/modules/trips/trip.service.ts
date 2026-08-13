import { AppError } from '../../middleware/error-handler.js';
import { TripRepository, type Trip } from './trip.repository.js';

export interface CreateTripRequest {
  organizationId?: string;
  name: string;
  description?: string;
  destination?: string;
  startDate?: string | null;
  endDate?: string | null;
  currency?: string;
  budgetCents?: number;
  createdBy: string | null;
}

export class TripService {
  constructor(private readonly repo = new TripRepository()) {}

  listTrips(organizationId?: string): Promise<Trip[]> {
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

  createTrip(input: CreateTripRequest): Promise<Trip> {
    if (!input.organizationId) {
      throw new AppError(
        400,
        'ORGANIZATION_REQUIRED',
        'An active organization membership is required to create a trip',
      );
    }

    return this.repo.create({
      organizationId: input.organizationId,
      name: input.name,
      description: input.description ?? '',
      destination: input.destination ?? '',
      startDate: input.startDate ?? null,
      endDate: input.endDate ?? null,
      currency: input.currency ?? 'INR',
      budgetCents: input.budgetCents ?? 0,
      createdBy: input.createdBy,
    });
  }

  async deleteTrip(id: string, requesterId: string): Promise<void> {
    const trip = await this.getTrip(id);
    if (trip.createdBy !== requesterId) {
      throw new AppError(403, 'FORBIDDEN', 'Only the trip owner can delete this trip');
    }
    await this.repo.delete(id);
  }
}
