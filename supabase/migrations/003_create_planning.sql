-- 003_create_planning.sql
-- Availability, destination options, and itinerary items

create table if not exists public.availability (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  start_date date not null,
  end_date date not null,
  status text not null default 'available',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint availability_status_check
    check (status in ('available', 'unavailable', 'flexible')),
  constraint availability_date_range_check
    check (end_date >= start_date)
);

create table if not exists public.destinations (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips (id) on delete cascade,
  name text not null,
  country text,
  region text,
  description text,
  estimated_cost_cents bigint,
  currency text not null default 'INR',
  vote_score integer not null default 0,
  is_selected boolean not null default false,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.itinerary_items (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips (id) on delete cascade,
  destination_id uuid references public.destinations (id) on delete set null,
  title text not null,
  description text,
  category text not null default 'activity',
  start_at timestamptz,
  end_at timestamptz,
  location_name text,
  location_address text,
  estimated_cost_cents bigint,
  currency text not null default 'INR',
  sort_order integer not null default 0,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint itinerary_category_check
    check (category in ('travel', 'lodging', 'meal', 'activity', 'meeting', 'other')),
  constraint itinerary_time_range_check
    check (end_at is null or start_at is null or end_at >= start_at)
);

create index if not exists availability_trip_id_idx on public.availability (trip_id);
create index if not exists availability_user_id_idx on public.availability (user_id);
create index if not exists destinations_trip_id_idx on public.destinations (trip_id);
create index if not exists itinerary_items_trip_id_idx on public.itinerary_items (trip_id);
create index if not exists itinerary_items_start_at_idx on public.itinerary_items (start_at);

create trigger availability_set_updated_at
  before update on public.availability
  for each row execute function public.set_updated_at();

create trigger destinations_set_updated_at
  before update on public.destinations
  for each row execute function public.set_updated_at();

create trigger itinerary_items_set_updated_at
  before update on public.itinerary_items
  for each row execute function public.set_updated_at();
