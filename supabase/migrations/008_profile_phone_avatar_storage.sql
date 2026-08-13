-- 008_profile_phone_avatar_storage.sql
-- Persist phone from signup metadata; add public avatars storage bucket + RLS.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  display text;
  phone_val text;
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

  phone_val := nullif(trim(coalesce(new.raw_user_meta_data ->> 'phone', '')), '');

  insert into public.profiles (id, email, display_name, phone)
  values (new.id, new.email, display, phone_val)
  on conflict (id) do update
    set email = excluded.email,
        display_name = coalesce(nullif(excluded.display_name, ''), public.profiles.display_name),
        phone = coalesce(excluded.phone, public.profiles.phone),
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

-- Avatar uploads (one folder per user id).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'avatars',
  'avatars',
  true,
  2097152,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists avatars_public_read on storage.objects;
create policy avatars_public_read
  on storage.objects for select
  to public
  using (bucket_id = 'avatars');

drop policy if exists avatars_owner_insert on storage.objects;
create policy avatars_owner_insert
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists avatars_owner_update on storage.objects;
create policy avatars_owner_update
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists avatars_owner_delete on storage.objects;
create policy avatars_owner_delete
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
