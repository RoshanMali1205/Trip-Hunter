-- 001_create_organizations.sql
-- Core tenancy: organizations, user profiles, membership

create extension if not exists "pgcrypto";

create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  logo_url text,
  billing_email text,
  settings jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null unique,
  display_name text not null,
  avatar_url text,
  phone text,
  timezone text not null default 'UTC',
  preferred_currency text not null default 'INR',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.org_members (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  role text not null default 'member',
  status text not null default 'active',
  invited_by uuid references public.profiles (id) on delete set null,
  joined_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint org_members_role_check
    check (role in ('owner', 'admin', 'member', 'viewer')),
  constraint org_members_status_check
    check (status in ('invited', 'active', 'suspended', 'removed')),
  constraint org_members_unique unique (organization_id, user_id)
);

create index if not exists org_members_organization_id_idx
  on public.org_members (organization_id);
create index if not exists org_members_user_id_idx
  on public.org_members (user_id);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger organizations_set_updated_at
  before update on public.organizations
  for each row execute function public.set_updated_at();

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

create trigger org_members_set_updated_at
  before update on public.org_members
  for each row execute function public.set_updated_at();
