-- Destination poll: first-class image + city; availability poll option catalog.

alter table public.destinations
  add column if not exists image_url text,
  add column if not exists city text;

-- Backfill from existing seed/metadata + region.
update public.destinations
set
  image_url = coalesce(image_url, nullif(metadata->>'imageUrl', '')),
  city = coalesce(nullif(city, ''), nullif(region, ''))
where image_url is null or city is null;

create table if not exists public.availability_options (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips (id) on delete cascade,
  start_date date not null,
  end_date date not null,
  label text,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  constraint availability_options_date_range_check
    check (end_date >= start_date),
  constraint availability_options_unique_range
    unique (trip_id, start_date, end_date)
);

create index if not exists availability_options_trip_id_idx
  on public.availability_options (trip_id);
