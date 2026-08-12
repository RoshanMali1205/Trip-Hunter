-- 002_create_teams_and_trips.sql
-- Teams, trips, and trip membership

create table if not exists public.teams (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  name text not null,
  description text,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint teams_org_name_unique unique (organization_id, name)
);

create table if not exists public.team_members (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  role text not null default 'member',
  created_at timestamptz not null default now(),
  constraint team_members_role_check
    check (role in ('lead', 'member')),
  constraint team_members_unique unique (team_id, user_id)
);

create table if not exists public.trips (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  team_id uuid references public.teams (id) on delete set null,
  name text not null,
  description text,
  destination_summary text,
  status text not null default 'draft',
  start_date date,
  end_date date,
  timezone text not null default 'Asia/Kolkata',
  currency text not null default 'INR',
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint trips_status_check
    check (status in ('draft', 'planning', 'confirmed', 'in_progress', 'completed', 'cancelled')),
  constraint trips_date_range_check
    check (end_date is null or start_date is null or end_date >= start_date)
);

create table if not exists public.trip_members (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  role text not null default 'traveler',
  rsvp_status text not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint trip_members_role_check
    check (role in ('organizer', 'traveler', 'viewer')),
  constraint trip_members_rsvp_check
    check (rsvp_status in ('pending', 'accepted', 'declined', 'maybe')),
  constraint trip_members_unique unique (trip_id, user_id)
);

create index if not exists teams_organization_id_idx on public.teams (organization_id);
create index if not exists trips_organization_id_idx on public.trips (organization_id);
create index if not exists trips_team_id_idx on public.trips (team_id);
create index if not exists trips_status_idx on public.trips (status);
create index if not exists trip_members_trip_id_idx on public.trip_members (trip_id);
create index if not exists trip_members_user_id_idx on public.trip_members (user_id);

create trigger teams_set_updated_at
  before update on public.teams
  for each row execute function public.set_updated_at();

create trigger trips_set_updated_at
  before update on public.trips
  for each row execute function public.set_updated_at();

create trigger trip_members_set_updated_at
  before update on public.trip_members
  for each row execute function public.set_updated_at();
