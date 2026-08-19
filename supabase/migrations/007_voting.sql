-- 007_voting.sql
-- Real per-user vote tracking for availability polls and destination picks.

-- A user can vote on multiple date-range options per trip (available/flexible/
-- unavailable each), but only once per exact range — re-voting updates it.
alter table public.availability
  add constraint availability_unique_per_user_range unique (trip_id, user_id, start_date, end_date);

-- Single-choice: one destination vote per user per trip. Changing your vote
-- moves it rather than adding a second row.
create table if not exists public.destination_votes (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips (id) on delete cascade,
  destination_id uuid not null references public.destinations (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint destination_votes_unique_per_trip unique (trip_id, user_id)
);

create index if not exists destination_votes_destination_id_idx on public.destination_votes (destination_id);
create index if not exists destination_votes_trip_id_idx on public.destination_votes (trip_id);

alter table public.destination_votes enable row level security;

drop policy if exists destination_votes_select_own on public.destination_votes;
create policy destination_votes_select_own
  on public.destination_votes for select
  to authenticated
  using (user_id = (select auth.uid()));
