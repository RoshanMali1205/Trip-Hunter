-- 006_auth_profile_trigger.sql
-- Create a public.profiles row when a new auth.users account is created.
-- Also seeds a default organization membership for the first org (if any),
-- otherwise creates a personal org so trip tenancy works out of the box.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  display text;
  first_org uuid;
  new_org uuid;
begin
  display := coalesce(
    nullif(new.raw_user_meta_data ->> 'display_name', ''),
    nullif(
      trim(
        coalesce(new.raw_user_meta_data ->> 'first_name', '') ||
        ' ' ||
        coalesce(new.raw_user_meta_data ->> 'last_name', '')
      ),
      ''
    ),
    split_part(new.email, '@', 1)
  );

  insert into public.profiles (id, email, display_name)
  values (new.id, new.email, display)
  on conflict (id) do update
    set email = excluded.email,
        display_name = coalesce(nullif(excluded.display_name, ''), public.profiles.display_name),
        updated_at = now();

  select id into first_org
  from public.organizations
  order by created_at asc
  limit 1;

  if first_org is null then
    insert into public.organizations (name, slug)
    values (
      coalesce(display, 'My team') || '''s workspace',
      'org-' || substr(replace(new.id::text, '-', ''), 1, 12)
    )
    returning id into new_org;

    first_org := new_org;
  end if;

  insert into public.org_members (organization_id, user_id, role, status, joined_at)
  values (first_org, new.id, 'member', 'active', now())
  on conflict on constraint org_members_unique do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Allow signed-in users to read their own profile and memberships.
alter table public.profiles enable row level security;
alter table public.org_members enable row level security;
alter table public.organizations enable row level security;

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
  using (
    exists (
      select 1
      from public.org_members m
      where m.organization_id = organizations.id
        and m.user_id = (select auth.uid())
        and m.status = 'active'
    )
  );
