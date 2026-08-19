-- 019_rls_org_trip_policies.sql
-- Policies for tables that 018 put behind RLS.
--
-- RLS without a policy = deny for `anon` / `authenticated`. Enabling RLS
-- (018) without this file locks PostgREST; always apply 018 and 019 together.
--
-- Policy model (defense in depth; Express + service-role still does real authz):
--   org member  → teams, team_members, trips in that organization
--   org member of the trip's org → trip-scoped rows (availability, bookings, …)
--   own user_id → notifications; destination_votes writes
-- Profiles / organizations / org_members stay on the 006 policies.
-- destination_votes already had SELECT-own in 007; this adds trip-wide read
-- and own-row write.
--
-- Helpers are SECURITY DEFINER so policy checks do not recurse through RLS.
-- Do not FORCE ROW LEVEL SECURITY (would affect table owners / SQL Editor).
--
-- Idempotent. Safe if some tables are missing. Apply after 017 and 018.
-- SQL Editor: a column named `th_policy_all` was the old SELECT-of-void
-- helper (success, not an error). This file now ends by listing policies.

create or replace function public.is_org_member(p_org_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.org_members
    where organization_id = p_org_id
      and user_id = (select auth.uid())
      and status = 'active'
  );
$$;

create or replace function public.can_access_trip(p_trip_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.trips t
    where t.id = p_trip_id
      and public.is_org_member(t.organization_id)
  );
$$;

revoke all on function public.is_org_member(uuid) from public;
revoke all on function public.can_access_trip(uuid) from public;
grant execute on function public.is_org_member(uuid) to authenticated;
grant execute on function public.can_access_trip(uuid) to authenticated;

-- FOR ALL on a table if it exists: org/trip members may select/insert/update/delete.
create or replace function public.th_policy_all(
  p_table text,
  p_policy text,
  p_using text,
  p_check text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if to_regclass('public.' || p_table) is null then
    return;
  end if;
  execute format('alter table public.%I enable row level security', p_table);
  execute format('drop policy if exists %I on public.%I', p_policy, p_table);
  execute format(
    'create policy %I on public.%I for all to authenticated using (%s) with check (%s)',
    p_policy,
    p_table,
    p_using,
    coalesce(p_check, p_using)
  );
end;
$$;

-- PERFORM (not SELECT) so the SQL Editor does not show a void column named th_policy_all.
do $$
begin
  perform public.th_policy_all(
    'teams', 'teams_org_member',
    'public.is_org_member(organization_id)'
  );
  perform public.th_policy_all(
    'team_members', 'team_members_org_member',
    'exists (select 1 from public.teams t where t.id = team_id and public.is_org_member(t.organization_id))'
  );
  perform public.th_policy_all(
    'trips', 'trips_org_member',
    'public.is_org_member(organization_id)'
  );
  perform public.th_policy_all(
    'trip_members', 'trip_members_trip_access',
    'public.can_access_trip(trip_id)'
  );
  perform public.th_policy_all(
    'availability', 'availability_trip_access',
    'public.can_access_trip(trip_id)'
  );
  perform public.th_policy_all(
    'availability_options', 'availability_options_trip_access',
    'public.can_access_trip(trip_id)'
  );
  perform public.th_policy_all(
    'destinations', 'destinations_trip_access',
    'public.can_access_trip(trip_id)'
  );
  perform public.th_policy_all(
    'itinerary_items', 'itinerary_items_trip_access',
    'public.can_access_trip(trip_id)'
  );
  perform public.th_policy_all(
    'bookings', 'bookings_trip_access',
    'public.can_access_trip(trip_id)'
  );
  perform public.th_policy_all(
    'budgets', 'budgets_trip_access',
    'public.can_access_trip(trip_id)'
  );
  perform public.th_policy_all(
    'budget_categories', 'budget_categories_trip_access',
    'exists (select 1 from public.budgets b where b.id = budget_id and public.can_access_trip(b.trip_id))'
  );
  perform public.th_policy_all(
    'expenses', 'expenses_trip_access',
    'public.can_access_trip(trip_id)'
  );
  perform public.th_policy_all(
    'expense_splits', 'expense_splits_trip_access',
    'exists (select 1 from public.expenses e where e.id = expense_id and public.can_access_trip(e.trip_id))'
  );
  perform public.th_policy_all(
    'tasks', 'tasks_trip_access',
    'public.can_access_trip(trip_id)'
  );
  perform public.th_policy_all(
    'documents', 'documents_trip_access',
    'public.can_access_trip(trip_id)'
  );
  perform public.th_policy_all(
    'approvals', 'approvals_trip_access',
    'public.can_access_trip(trip_id)'
  );
  perform public.th_policy_all(
    'comments', 'comments_trip_access',
    'public.can_access_trip(trip_id)'
  );
  perform public.th_policy_all(
    'settlement_payments', 'settlement_payments_trip_access',
    'public.can_access_trip(trip_id)'
  );
  perform public.th_policy_all(
    'trip_email_invites', 'trip_email_invites_trip_access',
    'public.can_access_trip(trip_id)'
  );
  perform public.th_policy_all(
    'activity_logs', 'activity_logs_org_or_trip',
    'public.is_org_member(organization_id) or public.can_access_trip(trip_id)'
  );
  perform public.th_policy_all(
    'destination_votes', 'destination_votes_trip_access',
    'public.can_access_trip(trip_id)',
    'public.can_access_trip(trip_id) and user_id = (select auth.uid())'
  );
  -- 007 select-own is a subset of trip-access SELECT (permissive policies OR).
  if to_regclass('public.destination_votes') is not null then
    execute 'drop policy if exists destination_votes_select_own on public.destination_votes';
  end if;
end $$;

-- Inbox is per user, not per trip.
do $$
begin
  if to_regclass('public.notifications') is null then
    return;
  end if;
  alter table public.notifications enable row level security;
  drop policy if exists notifications_own on public.notifications;
  create policy notifications_own
    on public.notifications
    for all
    to authenticated
    using (user_id = (select auth.uid()))
    with check (user_id = (select auth.uid()));
end $$;

-- Helper is only for this migration.
drop function if exists public.th_policy_all(text, text, text, text);

notify pgrst, 'reload schema';

-- What the SQL Editor should show: policy names, not a void `th_policy_all` column.
select tablename, policyname
from pg_policies
where schemaname = 'public'
order by 1, 2;
