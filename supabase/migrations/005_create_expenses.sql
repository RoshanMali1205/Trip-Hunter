-- 005_create_expenses.sql
-- Expenses, splits, collaboration, and audit surfaces

create table if not exists public.expenses (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips (id) on delete cascade,
  budget_id uuid references public.budgets (id) on delete set null,
  booking_id uuid references public.bookings (id) on delete set null,
  title text not null,
  description text,
  category text not null default 'other',
  amount_cents bigint not null,
  currency text not null default 'INR',
  paid_by uuid references public.profiles (id) on delete set null,
  incurred_on date not null default (current_date),
  status text not null default 'submitted',
  receipt_url text,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint expenses_amount_positive check (amount_cents > 0),
  constraint expenses_category_check
    check (category in ('travel', 'lodging', 'food', 'activity', 'supplies', 'other')),
  constraint expenses_status_check
    check (status in ('draft', 'submitted', 'approved', 'rejected', 'reimbursed'))
);

create table if not exists public.expense_splits (
  id uuid primary key default gen_random_uuid(),
  expense_id uuid not null references public.expenses (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  share_cents bigint not null,
  share_pct numeric(5, 2),
  created_at timestamptz not null default now(),
  constraint expense_splits_share_nonneg check (share_cents >= 0),
  constraint expense_splits_unique unique (expense_id, user_id)
);

create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips (id) on delete cascade,
  title text not null,
  description text,
  status text not null default 'todo',
  priority text not null default 'medium',
  assignee_id uuid references public.profiles (id) on delete set null,
  due_at timestamptz,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint tasks_status_check
    check (status in ('todo', 'in_progress', 'blocked', 'done', 'cancelled')),
  constraint tasks_priority_check
    check (priority in ('low', 'medium', 'high', 'urgent'))
);

create table if not exists public.documents (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips (id) on delete cascade,
  title text not null,
  doc_type text not null default 'other',
  storage_path text not null,
  mime_type text,
  size_bytes bigint,
  uploaded_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint documents_type_check
    check (doc_type in ('itinerary', 'receipt', 'ticket', 'policy', 'other'))
);

create table if not exists public.approvals (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips (id) on delete cascade,
  subject_type text not null,
  subject_id uuid not null,
  status text not null default 'pending',
  requested_by uuid references public.profiles (id) on delete set null,
  reviewed_by uuid references public.profiles (id) on delete set null,
  reviewed_at timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint approvals_subject_type_check
    check (subject_type in ('expense', 'booking', 'budget', 'trip')),
  constraint approvals_status_check
    check (status in ('pending', 'approved', 'rejected', 'cancelled'))
);

create table if not exists public.comments (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips (id) on delete cascade,
  subject_type text not null default 'trip',
  subject_id uuid,
  parent_id uuid references public.comments (id) on delete cascade,
  body text not null,
  author_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint comments_subject_type_check
    check (subject_type in ('trip', 'task', 'expense', 'booking', 'document', 'itinerary'))
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  organization_id uuid references public.organizations (id) on delete cascade,
  trip_id uuid references public.trips (id) on delete cascade,
  channel text not null default 'in_app',
  kind text not null,
  title text not null,
  body text,
  payload jsonb not null default '{}'::jsonb,
  read_at timestamptz,
  created_at timestamptz not null default now(),
  constraint notifications_channel_check
    check (channel in ('in_app', 'email', 'push'))
);

create table if not exists public.activity_logs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations (id) on delete cascade,
  trip_id uuid references public.trips (id) on delete cascade,
  actor_id uuid references public.profiles (id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists expenses_trip_id_idx on public.expenses (trip_id);
create index if not exists expenses_paid_by_idx on public.expenses (paid_by);
create index if not exists expense_splits_expense_id_idx on public.expense_splits (expense_id);
create index if not exists tasks_trip_id_idx on public.tasks (trip_id);
create index if not exists tasks_assignee_id_idx on public.tasks (assignee_id);
create index if not exists documents_trip_id_idx on public.documents (trip_id);
create index if not exists approvals_trip_id_idx on public.approvals (trip_id);
create index if not exists comments_trip_id_idx on public.comments (trip_id);
create index if not exists notifications_user_id_idx on public.notifications (user_id);
create index if not exists activity_logs_trip_id_idx on public.activity_logs (trip_id);
create index if not exists activity_logs_created_at_idx on public.activity_logs (created_at desc);

create trigger expenses_set_updated_at
  before update on public.expenses
  for each row execute function public.set_updated_at();

create trigger tasks_set_updated_at
  before update on public.tasks
  for each row execute function public.set_updated_at();

create trigger documents_set_updated_at
  before update on public.documents
  for each row execute function public.set_updated_at();

create trigger approvals_set_updated_at
  before update on public.approvals
  for each row execute function public.set_updated_at();

create trigger comments_set_updated_at
  before update on public.comments
  for each row execute function public.set_updated_at();
