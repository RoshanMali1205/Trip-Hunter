import { getSupabaseAdmin } from '../../config/supabase.js';
import { assertDbOrMock } from '../../config/data-mode.js';
import { AppError } from '../../middleware/error-handler.js';

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
  country: string;
  description: string;
  estimatedCost: number;
  voteCount: number;
  imageUrl?: string;
}

interface AvailabilityRow {
  start_date: string;
  end_date: string;
  status: 'available' | 'unavailable' | 'flexible';
}

interface DestinationRow {
  id: string;
  trip_id: string;
  name: string;
  country: string | null;
  description: string | null;
  estimated_cost_cents: number | null;
  currency: string;
  vote_score: number;
  metadata: Record<string, unknown> | null;
}

function aggregateAvailability(tripId: string, rows: AvailabilityRow[]): AvailabilityOption[] {
  const byRange = new Map<string, AvailabilityOption>();

  for (const row of rows) {
    const key = `${row.start_date}_${row.end_date}`;
    let option = byRange.get(key);
    if (!option) {
      option = {
        id: key,
        tripId,
        startDate: row.start_date,
        endDate: row.end_date,
        availableCount: 0,
        maybeCount: 0,
        notAvailableCount: 0,
        totalVotes: 0,
      };
      byRange.set(key, option);
    }
    if (row.status === 'available') option.availableCount += 1;
    else if (row.status === 'flexible') option.maybeCount += 1;
    else option.notAvailableCount += 1;
    option.totalVotes += 1;
  }

  return [...byRange.values()];
}

function mapDestination(row: DestinationRow): DestinationOption {
  return {
    id: row.id,
    tripId: row.trip_id,
    destinationName: row.name,
    country: row.country ?? '',
    description: row.description ?? '',
    estimatedCost: (row.estimated_cost_cents ?? 0) / 100,
    voteCount: row.vote_score,
    imageUrl: typeof row.metadata?.['imageUrl'] === 'string' ? (row.metadata['imageUrl'] as string) : undefined,
  };
}

export class PlanningRepository {
  async findAvailabilityByTrip(tripId: string): Promise<AvailabilityOption[]> {
    if (assertDbOrMock('availability') === 'memory') {
      return [];
    }

    const { data, error } = await getSupabaseAdmin()
      .from('availability')
      .select('start_date, end_date, status')
      .eq('trip_id', tripId);

    if (error) {
      throw new AppError(502, 'DB_ERROR', error.message);
    }

    return aggregateAvailability(tripId, (data ?? []) as AvailabilityRow[]);
  }

  async findDestinationsByTrip(tripId: string): Promise<DestinationOption[]> {
    if (assertDbOrMock('destinations') === 'memory') {
      return [];
    }

    const { data, error } = await getSupabaseAdmin()
      .from('destinations')
      .select('id, trip_id, name, country, description, estimated_cost_cents, currency, vote_score, metadata')
      .eq('trip_id', tripId)
      .order('vote_score', { ascending: false });

    if (error) {
      throw new AppError(502, 'DB_ERROR', error.message);
    }

    return ((data ?? []) as DestinationRow[]).map(mapDestination);
  }
}
