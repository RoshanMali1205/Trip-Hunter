import type { Booking } from '../models/trip.model';

/** Curated Unsplash covers for photo-first booking cards by type. */
export const BOOKING_TYPE_IMAGES: Record<Booking['bookingType'], string> = {
  HOTEL:
    'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1000&q=80',
  BUS:
    // Volvo / coach bus
    'https://images.unsplash.com/photo-1557223562-6c77ef16210f?auto=format&fit=crop&w=1000&q=80',
  CAB:
    'https://images.unsplash.com/photo-1449965408869-eaa3f722e40d?auto=format&fit=crop&w=1000&q=80',
  ACTIVITY:
    'https://images.unsplash.com/photo-1551632811-561732d1e306?auto=format&fit=crop&w=1000&q=80',
  FLIGHT:
    'https://images.unsplash.com/photo-1436491865332-7a61a109cc05?auto=format&fit=crop&w=1000&q=80',
  TRAIN:
    'https://images.unsplash.com/photo-1474487548417-781cb71495f3?auto=format&fit=crop&w=1000&q=80',
  RESTAURANT:
    'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1000&q=80',
  OTHER:
    'https://images.unsplash.com/photo-1488646953014-85cb44e25828?auto=format&fit=crop&w=1000&q=80',
};

/** Prefer an explicit booking image; otherwise use the type default. */
export function bookingImageUrl(
  booking: Pick<Booking, 'bookingType' | 'imageUrl'>,
): string {
  const custom = booking.imageUrl?.trim();
  if (custom) return custom;
  return BOOKING_TYPE_IMAGES[booking.bookingType] ?? BOOKING_TYPE_IMAGES.OTHER;
}
