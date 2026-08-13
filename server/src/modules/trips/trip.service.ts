import { AppError } from '../../middleware/error-handler.js';
import { TripRepository, type Trip } from './trip.repository.js';

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
}
