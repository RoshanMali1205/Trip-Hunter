-- 014_avatar_remove_size_limit.sql
-- Remove the avatars bucket file size cap (was 2 MB in 008, then 15 MB in 009).
-- The app still compresses to JPEG client-side before upload.

update storage.buckets
set file_size_limit = null
where id = 'avatars';
