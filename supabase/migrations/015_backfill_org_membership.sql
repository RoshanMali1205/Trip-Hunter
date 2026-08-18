-- 015_backfill_org_membership.sql
-- Heal accounts that can sign in but cannot create trips because they were
-- created before handle_new_user() (or the trigger was not applied).
-- Every auth user gets a profile + an active org membership.

insert into public.profiles (id, email, display_name)
select
  u.id,
  coalesce(nullif(u.email, ''), u.id::text || '@users.local'),
  coalesce(
    nullif(u.raw_user_meta_data ->> 'display_name', ''),
    nullif(
      trim(
        coalesce(u.raw_user_meta_data ->> 'first_name', '') ||
        ' ' ||
        coalesce(u.raw_user_meta_data ->> 'last_name', '')
      ),
      ''
    ),
    split_part(coalesce(u.email, 'user'), '@', 1)
  )
from auth.users u
where not exists (
  select 1
  from public.profiles p
  where p.email = coalesce(nullif(u.email, ''), u.id::text || '@users.local')
    and p.id <> u.id
)
on conflict (id) do nothing;

insert into public.organizations (name, slug)
select 'Trip Hunter', 'trip-hunter'
where not exists (select 1 from public.organizations);

insert into public.org_members (organization_id, user_id, role, status, joined_at)
select
  (select id from public.organizations order by created_at asc limit 1),
  p.id,
  'member',
  'active',
  now()
from public.profiles p
where not exists (
  select 1
  from public.org_members m
  where m.user_id = p.id
)
on conflict on constraint org_members_unique do nothing;

update public.org_members
set
  status = 'active',
  joined_at = coalesce(joined_at, now())
where status = 'invited';
