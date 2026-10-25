-- Storage bucket for catalog images (spec 002, Constraints: uploads limited in
-- size). Public bucket: the files are served to visitors; only the admin writes.
-- Limit and types are the simplest sensible choice; spec 005 may refine them.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'images',
  'images',
  true,
  5242880, -- 5 MiB
  array['image/jpeg', 'image/png', 'image/webp', 'image/avif']
)
on conflict (id) do nothing;

create policy "public reads catalog images" on storage.objects
  for select to anon, authenticated using (bucket_id = 'images');

create policy "admin uploads catalog images" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'images' and public.is_admin());

create policy "admin changes catalog images" on storage.objects
  for update to authenticated
  using (bucket_id = 'images' and public.is_admin())
  with check (bucket_id = 'images' and public.is_admin());

create policy "admin deletes catalog images" on storage.objects
  for delete to authenticated
  using (bucket_id = 'images' and public.is_admin());
