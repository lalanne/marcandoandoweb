-- Private image storage (spec 002, "Image privacy", issue #45).
-- The `images` bucket was public and any visitor could list and fetch every
-- file, including photos of unpublished products and designs. Now the bucket is
-- private and reads follow the owner's published state. The site serves
-- published files from its own origin (/img/...), read with the anonymous key
-- so this policy decides; the admin previews any file at /panel/img/....
update storage.buckets set public = false where id = 'images';

drop policy "public reads catalog images" on storage.objects;

-- Listing is governed by this same select policy: a file that cannot be read
-- is not listed either. The image table is also under row-level security, but
-- the owner check is explicit here so this rule does not depend on it.
create policy "reads published or admin catalog images" on storage.objects
  for select to anon, authenticated using (
    bucket_id = 'images'
    and (
      public.is_admin()
      or exists (
        select 1
        from public.image i
        left join public.product p on p.id = i.product_id
        left join public.design d on d.id = i.design_id
        where i.storage_path = storage.objects.name
          and (coalesce(p.is_published, false) or coalesce(d.is_published, false))
      )
    )
  );
