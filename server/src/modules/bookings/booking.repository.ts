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
  booking_type: 'flight' | 'train' | 'hotel' | 'car' | 'activity' | 'other';
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
  hotel: 'HOTEL',
  car: 'CAB',
  activity: 'ACTIVITY',
  other: 'OTHER',
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

export class BookingRepository {
  async findByTrip(tripId: string): Promise<Booking[]> {
    if (assertDbOrMock('bookings') === 'memory') {
      return [];
    }

    const { data, error } = await getSupabaseAdmin()
      .from('bookings')
      .select(
        'id, trip_id, vendor_name, booking_type, confirmation_code, status, amount_cents, currency, starts_at, ends_at',
      )
      .eq('trip_id', tripId)
      .order('starts_at', { ascending: true, nullsFirst: false });

    if (error) {
      throw new AppError(502, 'DB_ERROR', error.message);
    }

    return ((data ?? []) as BookingRow[]).map(mapRow);
  }
}
