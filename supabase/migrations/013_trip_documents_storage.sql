-- 013_trip_documents_storage.sql
-- Public-readable bucket for trip documents (API uploads via service role).

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'trip-documents',
  'trip-documents',
  true,
  5242880,
  array[
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
    'text/plain',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ]
)
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists trip_documents_public_read on storage.objects;
create policy trip_documents_public_read
  on storage.objects for select
  to public
  using (bucket_id = 'trip-documents');
