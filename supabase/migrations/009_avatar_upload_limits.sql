-- 009_avatar_upload_limits.sql
-- Raise avatars bucket size so phone camera photos can be accepted;
-- the app compresses to JPEG before upload, but raw picks can be larger.

update storage.buckets
set
  file_size_limit = 15728640, -- 15 MB
  allowed_mime_types = array[
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
    'image/heic',
    'image/heif',
    'image/avif'
  ]
where id = 'avatars';
