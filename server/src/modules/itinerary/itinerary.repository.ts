import { getSupabaseAdmin } from '../../config/supabase.js';
import { assertDbOrMock } from '../../config/data-mode.js';
import { AppError } from '../../middleware/error-handler.js';

export type ItineraryItemType =
  | 'TRAVEL'
  | 'HOTEL'
  | 'FOOD'
  | 'ACTIVITY'
  | 'MEETING'
  | 'OTHER';

export interface ItineraryItem {
  id: string;
  dayId: string;
  title: string;
  description: string;
  type: ItineraryItemType;
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

interface ItineraryItemRow {
  id: string;
  title: string;
  description: string | null;
  category: 'travel' | 'lodging' | 'meal' | 'activity' | 'meeting' | 'other';
  start_at: string | null;
  end_at: string | null;
  location_name: string | null;
  sort_order: number;
}

const CATEGORY_TO_TYPE: Record<ItineraryItemRow['category'], ItineraryItemType> = {
  travel: 'TRAVEL',
  lodging: 'HOTEL',
  meal: 'FOOD',
  activity: 'ACTIVITY',
  meeting: 'MEETING',
  other: 'OTHER',
};

const TYPE_TO_CATEGORY: Record<ItineraryItemType, ItineraryItemRow['category']> = {
  TRAVEL: 'travel',
  HOTEL: 'lodging',
  FOOD: 'meal',
  ACTIVITY: 'activity',
  MEETING: 'meeting',
  OTHER: 'other',
};

function timeOf(iso: string | null): string {
  return iso ? iso.slice(11, 16) : '';
}

export interface CreateItineraryItemInput {
  tripId: string;
  title: string;
  description: string;
  type: ItineraryItemType;
  date: string;
  startTime: string;
  endTime: string;
  locationName: string;
  createdBy: string | null;
}

export class ItineraryRepository {
  async findByTrip(tripId: string): Promise<ItineraryDay[]> {
    if (assertDbOrMock('itinerary') === 'memory') {
      return [];
    }

    const { data, error } = await getSupabaseAdmin()
      .from('itinerary_items')
      .select('id, title, description, category, start_at, end_at, location_name, sort_order')
      .eq('trip_id', tripId)
      .order('start_at', { ascending: true, nullsFirst: false })
      .order('sort_order', { ascending: true });

    if (error) {
      throw new AppError(502, 'DB_ERROR', error.message);
    }

    const days = new Map<string, ItineraryDay>();
    let dayIndex = 0;

    for (const row of (data ?? []) as ItineraryItemRow[]) {
      const date = row.start_at ? row.start_at.slice(0, 10) : 'unscheduled';
      let day = days.get(date);
      if (!day) {
        day = {
          id: `day-${date}`,
          tripId,
          date,
          title: '',
          notes: '',
          sortOrder: dayIndex++,
          items: [],
        };
        days.set(date, day);
      }

      day.items.push({
        id: row.id,
        dayId: day.id,
        title: row.title,
        description: row.description ?? '',
        type: CATEGORY_TO_TYPE[row.category],
        startTime: timeOf(row.start_at),
        endTime: timeOf(row.end_at),
        locationName: row.location_name ?? '',
        sortOrder: row.sort_order,
      });
    }

    return [...days.values()];
  }

  async create(input: CreateItineraryItemInput): Promise<void> {
    if (assertDbOrMock('itinerary') === 'memory') {
      throw new AppError(503, 'SUPABASE_NOT_CONFIGURED', 'Supabase is required to add itinerary items');
    }

    const startAt = input.startTime ? `${input.date}T${input.startTime}:00` : `${input.date}T00:00:00`;
    const endAt = input.endTime ? `${input.date}T${input.endTime}:00` : null;

    const { error } = await getSupabaseAdmin()
      .from('itinerary_items')
      .insert({
        trip_id: input.tripId,
        title: input.title,
        description: input.description || null,
        category: TYPE_TO_CATEGORY[input.type],
        start_at: startAt,
        end_at: endAt,
        location_name: input.locationName || null,
        created_by: input.createdBy,
      });

    if (error) {
      throw new AppError(502, 'DB_ERROR', error.message);
    }
  }

  async delete(tripId: string, id: string): Promise<void> {
    if (assertDbOrMock('itinerary') === 'memory') {
      throw new AppError(503, 'SUPABASE_NOT_CONFIGURED', 'Supabase is required to delete itinerary items');
    }

    const { data, error } = await getSupabaseAdmin()
      .from('itinerary_items')
      .delete()
      .eq('id', id)
      .eq('trip_id', tripId)
      .select('id')
      .maybeSingle();

    if (error) {
      throw new AppError(502, 'DB_ERROR', error.message);
    }
    if (!data) {
      throw new AppError(404, 'ITINERARY_ITEM_NOT_FOUND', `Itinerary item ${id} was not found`);
    }
  }
}
