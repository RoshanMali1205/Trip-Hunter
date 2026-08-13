-- Allow bus bookings (Volvo coaches, etc.) alongside existing transport types.
alter table public.bookings
  drop constraint if exists bookings_booking_type_check;

alter table public.bookings
  add constraint bookings_booking_type_check
  check (booking_type in ('flight', 'train', 'bus', 'hotel', 'car', 'activity', 'other'));
