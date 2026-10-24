-- ============================================================================
-- 04_storage.sql: Storage Configuration & Security Policies (Safe & Re-runnable)
-- Bucket: 'school-media' (Public read, Admin-only write/delete, 5MB limit)
-- ============================================================================

-- 1. Create or update the 'school-media' bucket
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'school-media',
  'school-media',
  true,
  5242880, -- 5 MB limit
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml']
)
on conflict (id) do update set
  public = true,
  file_size_limit = 5242880,
  allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml'];

-- 2. Clean up any existing policies with the same name before creating
drop policy if exists "Public can view school media images" on storage.objects;
drop policy if exists "Admins can upload school media images" on storage.objects;
drop policy if exists "Admins can update school media images" on storage.objects;
drop policy if exists "Admins can delete school media images" on storage.objects;

-- 3. Allow ANY visitor (anonymous or logged-in) to VIEW images in 'school-media'
create policy "Public can view school media images"
  on storage.objects for select
  using (bucket_id = 'school-media');

-- 4. Allow ONLY authenticated administrators to UPLOAD new images
create policy "Admins can upload school media images"
  on storage.objects for insert
  with check (
    bucket_id = 'school-media'
    and (public.is_admin())
  );

-- 5. Allow ONLY authenticated administrators to UPDATE existing images
create policy "Admins can update school media images"
  on storage.objects for update
  using (
    bucket_id = 'school-media'
    and (public.is_admin())
  );

-- 6. Allow ONLY authenticated administrators to DELETE images
create policy "Admins can delete school media images"
  on storage.objects for delete
  using (
    bucket_id = 'school-media'
    and (public.is_admin())
  );
