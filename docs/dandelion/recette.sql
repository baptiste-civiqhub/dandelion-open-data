-- Recette du schéma : une seule requête, une ligne par contrôle. Toutes les lignes doivent avoir ok = true.
with t(name) as (
  values ('datasets'), ('textes'), ('articles'), ('alineas'), ('sorts'), ('amendements'), ('tags'), ('tag_links')
),
attendu(controle, attendu) as (values
  ('01 tables présentes', '8'),
  ('02 colonnes par table', 'alineas=8, amendements=29, articles=9, datasets=9, sorts=4, tag_links=9, tags=5, textes=9'),
  ('03 clés étrangères', '14'),
  ('04 tag_list_id unique sur les objets', '5'),
  ('05 clé étrangère sur tag_links.tag_list_id', '0'),
  ('06 unique (tag_list_id, tag_id)', '1'),
  ('07 index de tag_links', '2'),
  ('08 RLS activée', '8'),
  ('09 politiques de lecture', '8'),
  ('10 droits de lecture anon et authenticated', '16'),
  ('11 droits d''écriture anon et authenticated', '0'),
  ('12 lignes dans sorts', '8')
),
obtenu(controle, obtenu) as (
  select '01 tables présentes', count(*)::text
    from information_schema.tables where table_schema = 'public' and table_name in (select name from t)
  union all
  select '02 colonnes par table', string_agg(table_name || '=' || n, ', ' order by table_name)
    from (select table_name, count(*) n from information_schema.columns
          where table_schema = 'public' and table_name in (select name from t) group by table_name) c
  union all
  select '03 clés étrangères', count(*)::text
    from pg_constraint where contype = 'f' and connamespace = 'public'::regnamespace
     and conrelid::regclass::text in (select name from t)
  union all
  select '04 tag_list_id unique sur les objets', count(*)::text
    from pg_constraint c join pg_attribute a on a.attrelid = c.conrelid and a.attnum = c.conkey[1]
    where c.contype = 'u' and c.connamespace = 'public'::regnamespace
      and array_length(c.conkey, 1) = 1 and a.attname = 'tag_list_id'
  union all
  select '05 clé étrangère sur tag_links.tag_list_id', count(*)::text
    from pg_constraint c join pg_attribute a on a.attrelid = c.conrelid and a.attnum = any (c.conkey)
    where c.contype = 'f' and c.conrelid = 'public.tag_links'::regclass and a.attname = 'tag_list_id'
  union all
  select '06 unique (tag_list_id, tag_id)', count(*)::text
    from pg_constraint c
    where c.contype = 'u' and c.conrelid = 'public.tag_links'::regclass and array_length(c.conkey, 1) = 2
  union all
  select '07 index de tag_links', count(*)::text
    from pg_indexes where schemaname = 'public'
     and indexname in ('tag_links_dataset_type_idx', 'tag_links_tag_idx')
  union all
  select '08 RLS activée', count(*)::text
    from pg_class where relnamespace = 'public'::regnamespace and relname in (select name from t) and relrowsecurity
  union all
  select '09 politiques de lecture', count(*)::text
    from pg_policies where schemaname = 'public' and tablename in (select name from t)
     and policyname = 'lecture publique' and cmd = 'SELECT'
  union all
  select '10 droits de lecture anon et authenticated', count(*)::text
    from information_schema.role_table_grants
    where table_schema = 'public' and table_name in (select name from t)
      and grantee in ('anon', 'authenticated') and privilege_type = 'SELECT'
  union all
  select '11 droits d''écriture anon et authenticated', count(*)::text
    from information_schema.role_table_grants
    where table_schema = 'public' and table_name in (select name from t)
      and grantee in ('anon', 'authenticated') and privilege_type in ('INSERT', 'UPDATE', 'DELETE', 'TRUNCATE')
  union all
  select '12 lignes dans sorts', count(*)::text from public.sorts
)
select a.controle, a.attendu, o.obtenu, a.attendu = o.obtenu as ok
from attendu a left join obtenu o using (controle)
order by a.controle;
