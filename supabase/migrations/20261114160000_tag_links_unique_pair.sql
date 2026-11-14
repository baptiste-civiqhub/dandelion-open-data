-- Un même tag ne peut être posé qu'une fois sur un objet.
-- Les liens manuels restent en place : le script ne les écrase pas.

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'tag_links_tag_list_id_tag_id_key'
      and conrelid = 'public.tag_links'::regclass
  ) then
    alter table public.tag_links
      add constraint tag_links_tag_list_id_tag_id_key unique (tag_list_id, tag_id);
  end if;
end $$;
