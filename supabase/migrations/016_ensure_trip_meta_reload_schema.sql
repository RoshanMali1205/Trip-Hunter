-- 016_ensure_trip_meta_reload_schema.sql
-- Live create-trip failed with:
--   Could not find the 'approval_status' column of 'trips' in the schema cache
-- because 012 was never applied (or PostgREST still had the old schema cached).
-- Idempotent: safe to re-run.

alter table public.trips
  add column if not exists origin text,
  add column if not exists trip_type text not null default 'team_outing',
  add column if not exists max_members integer,
  add column if not exists approval_status text not null default 'not_required';

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'trips_trip_type_check'
  ) then
    alter table public.trips
      add constraint trips_trip_type_check
      check (
        trip_type in (
          'business',
          'team_outing',
          'corporate_offsite',
          'training_conference',
          'project_visit',
          'personal_group'
        )
      );
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'trips_approval_status_check'
  ) then
    alter table public.trips
      add constraint trips_approval_status_check
      check (
        approval_status in (
          'not_required',
          'pending',
          'approved',
          'rejected',
          'changes_requested'
        )
      );
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'trips_max_members_positive'
  ) then
    alter table public.trips
      add constraint trips_max_members_positive
      check (max_members is null or max_members > 0);
  end if;
end $$;

notify pgrst, 'reload schema';
