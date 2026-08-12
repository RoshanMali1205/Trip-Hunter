-- 004_create_bookings_and_budgets.sql
-- Bookings and trip budgets

create table if not exists public.bookings (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips (id) on delete cascade,
  itinerary_item_id uuid references public.itinerary_items (id) on delete set null,
  vendor_name text,
  booking_type text not null default 'other',
  confirmation_code text,
  status text not null default 'draft',
  booked_for uuid references public.profiles (id) on delete set null,
  amount_cents bigint,
  currency text not null default 'INR',
  booked_at timestamptz,
  starts_at timestamptz,
  ends_at timestamptz,
  notes text,
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint bookings_type_check
    check (booking_type in ('flight', 'train', 'hotel', 'car', 'activity', 'other')),
  constraint bookings_status_check
    check (status in ('draft', 'pending', 'confirmed', 'cancelled', 'completed'))
);

create table if not exists public.budgets (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips (id) on delete cascade,
  name text not null default 'Primary budget',
  total_cents bigint not null default 0,
  currency text not null default 'INR',
  contingency_pct numeric(5, 2) not null default 10.00,
  notes text,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint budgets_total_nonneg check (total_cents >= 0),
  constraint budgets_contingency_range check (contingency_pct >= 0 and contingency_pct <= 100)
);

create table if not exists public.budget_categories (
  id uuid primary key default gen_random_uuid(),
  budget_id uuid not null references public.budgets (id) on delete cascade,
  name text not null,
  allocated_cents bigint not null default 0,
  spent_cents bigint not null default 0,
  currency text not null default 'INR',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint budget_categories_allocated_nonneg check (allocated_cents >= 0),
  constraint budget_categories_spent_nonneg check (spent_cents >= 0),
  constraint budget_categories_unique unique (budget_id, name)
);

create index if not exists bookings_trip_id_idx on public.bookings (trip_id);
create index if not exists bookings_status_idx on public.bookings (status);
create index if not exists budgets_trip_id_idx on public.budgets (trip_id);
create index if not exists budget_categories_budget_id_idx on public.budget_categories (budget_id);

create trigger bookings_set_updated_at
  before update on public.bookings
  for each row execute function public.set_updated_at();

create trigger budgets_set_updated_at
  before update on public.budgets
  for each row execute function public.set_updated_at();

create trigger budget_categories_set_updated_at
  before update on public.budget_categories
  for each row execute function public.set_updated_at();
