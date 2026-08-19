-- Photo storage for the catch board. Run AFTER supabase/catches.sql succeeds.
-- Dashboard → SQL Editor → New query → paste → Run.
-- If this fails, create a public bucket named exactly: catches
-- (Storage → New bucket → name catches → Public on).

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'catches',
  'catches',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do update
set
  public = true,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "catches_media_read" on storage.objects;
create policy "catches_media_read"
  on storage.objects for select
  using (bucket_id = 'catches');

drop policy if exists "catches_media_insert" on storage.objects;
create policy "catches_media_insert"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'catches'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "catches_media_delete" on storage.objects;
create policy "catches_media_delete"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'catches'
    and (
      (storage.foldername(name))[1] = auth.uid()::text
      or exists (select 1 from public.admins a where a.user_id = auth.uid())
    )
  );
