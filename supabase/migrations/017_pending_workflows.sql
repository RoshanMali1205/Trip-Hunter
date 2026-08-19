-- 017_pending_workflows.sql
-- Settlement payments, email invites for users who have not signed up yet,
-- and a selected flag on availability poll options.
--
-- Idempotent. Safe if 011 was never applied: this file creates
-- public.availability_options (and destination image/city columns) when missing.
-- `ALTER TABLE … ADD COLUMN IF NOT EXISTS` still requires the table to exist,
-- which is why a skipped 011 used to fail here with 42P01.

create table if not exists public.settlement_payments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations (id) on delete set null,
  trip_id uuid not null references public.trips (id) on delete cascade,
  from_user_id uuid not null references public.profiles (id) on delete cascade,
  to_user_id uuid not null references public.profiles (id) on delete cascade,
  amount_cents bigint not null,
  currency text not null default 'INR',
  recorded_by uuid references public.profiles (id) on delete set null,
  paid_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  constraint settlement_payments_amount_positive check (amount_cents > 0),
  constraint settlement_payments_parties_distinct check (from_user_id <> to_user_id)
);

create index if not exists settlement_payments_trip_id_idx
  on public.settlement_payments (trip_id);
create index if not exists settlement_payments_from_to_idx
  on public.settlement_payments (from_user_id, to_user_id);

create table if not exists public.trip_email_invites (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips (id) on delete cascade,
  email text not null,
  role text not null default 'traveler',
  invited_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  claimed_at timestamptz,
  claimed_user_id uuid references public.profiles (id) on delete set null,
  constraint trip_email_invites_role_check
    check (role in ('organizer', 'traveler', 'viewer')),
  constraint trip_email_invites_unique unique (trip_id, email)
);

create index if not exists trip_email_invites_email_idx
  on public.trip_email_invites (email)
  where claimed_at is null;

-- Catch up 011 (poll photos + date-option catalog) when it was skipped.
do $$
begin
  if to_regclass('public.destinations') is not null then
    alter table public.destinations add column if not exists image_url text;
    alter table public.destinations add column if not exists city text;
  end if;
end $$;

create table if not exists public.availability_options (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips (id) on delete cascade,
  start_date date not null,
  end_date date not null,
  label text,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  is_selected boolean not null default false,
  constraint availability_options_date_range_check
    check (end_date >= start_date),
  constraint availability_options_unique_range
    unique (trip_id, start_date, end_date)
);

create index if not exists availability_options_trip_id_idx
  on public.availability_options (trip_id);

alter table public.availability_options
  add column if not exists is_selected boolean not null default false;

notify pgrst, 'reload schema';
