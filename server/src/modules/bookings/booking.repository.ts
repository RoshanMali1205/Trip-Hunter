import { getSupabaseAdmin } from '../../config/supabase.js';
import { assertDbOrMock } from '../../config/data-mode.js';
import { AppError } from '../../middleware/error-handler.js';

export type BookingType = 'FLIGHT' | 'TRAIN' | 'BUS' | 'HOTEL' | 'CAB' | 'ACTIVITY' | 'RESTAURANT' | 'OTHER';
export type BookingStatus = 'CONFIRMED' | 'PENDING' | 'CANCELLED';

export interface Booking {
  id: string;
  tripId: string;
  bookingType: BookingType;
  provider: string;
  bookingReference: string;
  confirmationNumber: string;
  startDatetime: string | null;
  endDatetime: string | null;
  amount: number;
  currency: string;
  status: BookingStatus;
}

interface BookingRow {
  id: string;
  trip_id: string;
  vendor_name: string | null;
  booking_type: 'flight' | 'train' | 'bus' | 'hotel' | 'car' | 'activity' | 'other';
  confirmation_code: string | null;
  status: 'draft' | 'pending' | 'confirmed' | 'cancelled' | 'completed';
  amount_cents: number | null;
  currency: string;
  starts_at: string | null;
  ends_at: string | null;
}

const TYPE_MAP: Record<BookingRow['booking_type'], BookingType> = {
  flight: 'FLIGHT',
  train: 'TRAIN',
  bus: 'BUS',
  hotel: 'HOTEL',
  car: 'CAB',
  activity: 'ACTIVITY',
  other: 'OTHER',
};

const TYPE_TO_DB: Record<
  'FLIGHT' | 'TRAIN' | 'BUS' | 'HOTEL' | 'CAB' | 'ACTIVITY' | 'OTHER',
  BookingRow['booking_type']
> = {
  FLIGHT: 'flight',
  TRAIN: 'train',
  BUS: 'bus',
  HOTEL: 'hotel',
  CAB: 'car',
  ACTIVITY: 'activity',
  OTHER: 'other',
};

const STATUS_MAP: Record<BookingRow['status'], BookingStatus> = {
  draft: 'PENDING',
  pending: 'PENDING',
  confirmed: 'CONFIRMED',
  completed: 'CONFIRMED',
  cancelled: 'CANCELLED',
};

function mapRow(row: BookingRow): Booking {
  return {
    id: row.id,
    tripId: row.trip_id,
    bookingType: TYPE_MAP[row.booking_type],
    provider: row.vendor_name ?? '',
    bookingReference: row.confirmation_code ?? '',
    confirmationNumber: row.confirmation_code ?? '',
    startDatetime: row.starts_at,
    endDatetime: row.ends_at,
    amount: (row.amount_cents ?? 0) / 100,
    currency: row.currency,
    status: STATUS_MAP[row.status],
  };
}

const BOOKING_SELECT =
  'id, trip_id, vendor_name, booking_type, confirmation_code, status, amount_cents, currency, starts_at, ends_at';

export interface CreateBookingInput {
  tripId: string;
  bookingType: 'FLIGHT' | 'TRAIN' | 'BUS' | 'HOTEL' | 'CAB' | 'ACTIVITY' | 'OTHER';
  provider: string;
  bookingReference: string;
  amountCents: number;
  currency: string;
  startDatetime: string | null;
  endDatetime: string | null;
  createdBy: string | null;
}

export interface UpdateBookingInput {
  bookingType?: CreateBookingInput['bookingType'];
  provider?: string;
  bookingReference?: string;
  amountCents?: number;
  currency?: string;
  startDatetime?: string | null;
  endDatetime?: string | null;
  status?: BookingStatus;
}

export class BookingRepository {
  async findByTrip(tripId: string): Promise<Booking[]> {
    if (assertDbOrMock('bookings') === 'memory') {
      return [];
    }

    const { data, error } = await getSupabaseAdmin()
      .from('bookings')
      .select(BOOKING_SELECT)
      .eq('trip_id', tripId)
      .order('starts_at', { ascending: true, nullsFirst: false });

    if (error) {
      throw new AppError(502, 'DB_ERROR', error.message);
    }

    return ((data ?? []) as BookingRow[]).map(mapRow);
  }

  async create(input: CreateBookingInput): Promise<Booking> {
    if (assertDbOrMock('bookings') === 'memory') {
      throw new AppError(503, 'SUPABASE_NOT_CONFIGURED', 'Supabase is required to add bookings');
    }

    const { data, error } = await getSupabaseAdmin()
      .from('bookings')
      .insert({
        trip_id: input.tripId,
        booking_type: TYPE_TO_DB[input.bookingType],
        vendor_name: input.provider,
        confirmation_code: input.bookingReference || null,
        status: 'pending',
        amount_cents: input.amountCents,
        currency: input.currency,
        starts_at: input.startDatetime,
        ends_at: input.endDatetime,
        created_by: input.createdBy,
      })
      .select(BOOKING_SELECT)
      .single();

    if (error) {
      throw new AppError(502, 'DB_ERROR', error.message);
    }

    return mapRow(data as BookingRow);
  }

  async update(tripId: string, id: string, input: UpdateBookingInput): Promise<Booking> {
    if (assertDbOrMock('bookings') === 'memory') {
      throw new AppError(503, 'SUPABASE_NOT_CONFIGURED', 'Supabase is required to update bookings');
    }

    const patch: Record<string, unknown> = {};
    if (input.bookingType !== undefined) patch['booking_type'] = TYPE_TO_DB[input.bookingType];
    if (input.provider !== undefined) patch['vendor_name'] = input.provider;
    if (input.bookingReference !== undefined) patch['confirmation_code'] = input.bookingReference || null;
    if (input.amountCents !== undefined) patch['amount_cents'] = input.amountCents;
    if (input.currency !== undefined) patch['currency'] = input.currency;
    if (input.startDatetime !== undefined) patch['starts_at'] = input.startDatetime;
    if (input.endDatetime !== undefined) patch['ends_at'] = input.endDatetime;
    if (input.status !== undefined) {
      patch['status'] =
        input.status === 'CONFIRMED' ? 'confirmed' : input.status === 'CANCELLED' ? 'cancelled' : 'pending';
    }

    if (Object.keys(patch).length === 0) {
      throw new AppError(400, 'VALIDATION_ERROR', 'No booking fields to update');
    }

    const { data, error } = await getSupabaseAdmin()
      .from('bookings')
      .update(patch)
      .eq('id', id)
      .eq('trip_id', tripId)
      .select(BOOKING_SELECT)
      .maybeSingle();

    if (error) {
      throw new AppError(502, 'DB_ERROR', error.message);
    }
    if (!data) {
      throw new AppError(404, 'BOOKING_NOT_FOUND', `Booking ${id} was not found`);
    }
    return mapRow(data as BookingRow);
  }

  async delete(tripId: string, id: string): Promise<void> {
    if (assertDbOrMock('bookings') === 'memory') {
      throw new AppError(503, 'SUPABASE_NOT_CONFIGURED', 'Supabase is required to delete bookings');
    }

    const { data, error } = await getSupabaseAdmin()
      .from('bookings')
      .delete()
      .eq('id', id)
      .eq('trip_id', tripId)
      .select('id')
      .maybeSingle();

    if (error) {
      throw new AppError(502, 'DB_ERROR', error.message);
    }
    if (!data) {
      throw new AppError(404, 'BOOKING_NOT_FOUND', `Booking ${id} was not found`);
    }
  }
}
