-- 020_rls_auth_initplan.sql
-- The Table Editor orange "Auth RLS Initialization Plan" items are a
-- performance advisor (not a failed migration). Postgres re-evaluates
-- bare auth.uid() per row; wrap it as (select auth.uid()) so it runs once.
--
-- Also drop overlapping policies that were added in the dashboard. Permissive
-- policies OR together, so extras on organizations/trips duplicated access
-- and multiplied the advisor list. 019 trips_org_member already covers
-- select/insert/update/delete for org members.
--
-- Idempotent. Paste after 019. The Express API still uses the service role.

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

-- 006 policies: wrap auth.uid().
drop policy if exists profiles_select_own on public.profiles;
create policy profiles_select_own
  on public.profiles for select
  to authenticated
  using (id = (select auth.uid()));

drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own
  on public.profiles for update
  to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

drop policy if exists org_members_select_own on public.org_members;
create policy org_members_select_own
  on public.org_members for select
  to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists organizations_select_member on public.organizations;
create policy organizations_select_member
  on public.organizations for select
  to authenticated
  using (public.is_org_member(id));

-- Dashboard extras: same access as 006/019, each one an InitPlan warning.
drop policy if exists orgs_select_if_member on public.organizations;
drop policy if exists orgs_insert_if_self_is_member on public.organizations;
drop policy if exists orgs_update_if_member on public.organizations;
drop policy if exists orgs_delete_if_member on public.organizations;
drop policy if exists trips_insert_if_org_member on public.trips;
drop policy if exists trips_select_if_trip_member on public.trips;
drop policy if exists trips_update_if_trip_member on public.trips;

-- 007 select-own is covered by 019 trip-access SELECT.
drop policy if exists destination_votes_select_own on public.destination_votes;

do $$
begin
  if to_regclass('public.destination_votes') is null then
    return;
  end if;
  drop policy if exists destination_votes_trip_access on public.destination_votes;
  create policy destination_votes_trip_access
    on public.destination_votes
    for all
    to authenticated
    using (public.can_access_trip(trip_id))
    with check (public.can_access_trip(trip_id) and user_id = (select auth.uid()));
end $$;

do $$
begin
  if to_regclass('public.notifications') is null then
    return;
  end if;
  drop policy if exists notifications_own on public.notifications;
  create policy notifications_own
    on public.notifications
    for all
    to authenticated
    using (user_id = (select auth.uid()))
    with check (user_id = (select auth.uid()));
end $$;

notify pgrst, 'reload schema';

select tablename, policyname
from pg_policies
where schemaname = 'public'
order by 1, 2;
