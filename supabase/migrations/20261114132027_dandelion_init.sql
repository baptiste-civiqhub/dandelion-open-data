-- DANDELION, schéma minimal au vocabulaire Hémicycle : un jeu de données, des textes,
-- des articles, des alinéas, des amendements, des tags.
-- Lecture publique, écriture réservée aux scripts (clé secrète).
-- tag_list_id : chaque objet étiquetable porte un identifiant de liste de tags, unique ;
-- tag_links le reprend pour regrouper tous les tags d'un même objet.

create table public.datasets (
  id           uuid primary key default gen_random_uuid(),
  slug         text not null unique,
  name         text not null,
  description  text,
  source_label text not null default 'Assemblée nationale, données servies par Hémicycle',
  license      text not null default 'Licence Ouverte (Etalab 2.0)',
  perimeter    jsonb not null default '{}'::jsonb,
  imported_at  timestamptz not null default now(),
  tag_list_id  uuid not null default gen_random_uuid() unique
);

create table public.textes (
  id            uuid primary key default gen_random_uuid(),
  dataset_id    uuid not null references public.datasets (id) on delete cascade,
  uid           text not null unique,
  titre         text not null,
  slug          text not null unique,
  legislature   smallint,
  etape_texte   text,
  organe_examen text,
  tag_list_id   uuid not null default gen_random_uuid() unique
);
create index textes_dataset_idx on public.textes (dataset_id);

create table public.articles (
  id          uuid primary key default gen_random_uuid(),
  dataset_id  uuid not null references public.datasets (id) on delete cascade,
  texte_id    uuid not null references public.textes (id) on delete cascade,
  uid         text not null unique,
  designation text not null,
  titre       text,
  dispositif  text,
  ordre       integer not null,
  tag_list_id uuid not null default gen_random_uuid() unique
);
create index articles_texte_ordre_idx on public.articles (texte_id, ordre);
create index articles_dataset_idx     on public.articles (dataset_id);

create table public.alineas (
  id          uuid primary key default gen_random_uuid(),
  dataset_id  uuid not null references public.datasets (id) on delete cascade,
  texte_id    uuid not null references public.textes (id) on delete cascade,
  article_id  uuid not null references public.articles (id) on delete cascade,
  numero      integer not null,
  designation text,
  dispositif  text,
  tag_list_id uuid not null default gen_random_uuid() unique,
  unique (article_id, numero)
);
create index alineas_texte_idx   on public.alineas (texte_id);
create index alineas_dataset_idx on public.alineas (dataset_id);

create table public.sorts (
  code          text primary key,
  label         text not null,
  display_order smallint not null,
  color_token   text not null
);
insert into public.sorts (code, label, display_order, color_token) values
  ('adopte',      'Voté : le texte est modifié',                                1, '--sort-adopte'),
  ('rejete',      'Repoussé par un vote : le texte ne change pas',              2, '--sort-rejete'),
  ('tombe',       'Devenu sans objet après l''adoption d''un autre amendement', 3, '--sort-non-vote'),
  ('retire',      'Son auteur y a renoncé',                                     4, '--sort-non-vote'),
  ('non_soutenu', 'Personne ne l''a défendu en séance',                         5, '--sort-non-vote'),
  ('irrecevable', 'Écarté avant le débat, car contraire aux règles de dépôt',   6, '--sort-irrecevable'),
  ('en_attente',  'Pas encore examiné',                                         7, '--sort-en-attente'),
  ('autre',       'Sort non reconnu : à vérifier',                              8, '--sort-en-attente');

create table public.amendements (
  id                     uuid primary key default gen_random_uuid(),
  dataset_id             uuid not null references public.datasets (id) on delete cascade,
  texte_id               uuid not null references public.textes (id) on delete cascade,
  uid                    text not null unique,
  numero_long            text not null,
  article_id             uuid references public.articles (id),
  division_titre         text,
  division_avant_apres   text not null default 'A' check (division_avant_apres in ('A', 'AVANT', 'APRES')),
  alinea_id              uuid references public.alineas (id),
  amendement_parent_id   uuid references public.amendements (id),
  amendement_parent      text,
  tri_amendement         text,
  rang                   integer,
  sort                   text not null default 'en_attente' references public.sorts (code),
  sort_en_seance         text,
  etat                   text,
  sous_etat              text,
  dispositif             text,
  expose_sommaire        text,
  signataires_affichable text,
  acteur_ref             text,
  type_auteur            text,
  groupe_politique_ref   text,
  discussion_commune     text,
  discussion_identique   text,
  date_depot             timestamptz,
  date_sort              timestamptz,
  document_uri           text,
  tag_list_id            uuid not null default gen_random_uuid() unique,
  constraint amendements_pas_son_propre_parent check (amendement_parent_id is distinct from id)
);
create index amendements_texte_rang_idx on public.amendements (texte_id, rang);
create index amendements_dataset_idx    on public.amendements (dataset_id);
create index amendements_article_idx    on public.amendements (article_id);
create index amendements_alinea_idx     on public.amendements (alinea_id) where alinea_id is not null;
create index amendements_parent_idx     on public.amendements (amendement_parent_id) where amendement_parent_id is not null;
create index amendements_commune_idx    on public.amendements (discussion_commune) where discussion_commune is not null;
create index amendements_identique_idx  on public.amendements (discussion_identique) where discussion_identique is not null;

create table public.tags (
  id          uuid primary key default gen_random_uuid(),
  slug        text not null unique,
  label       text not null,
  category    text not null default 'theme',
  description text
);
create index tags_category_idx on public.tags (category);

-- Un tag posé sur un objet. tag_list_id reprend celui de l'objet : toutes les lignes
-- d'un même objet partagent la même valeur. Ce n'est ni une clé primaire, ni une clé étrangère.
create table public.tag_links (
  id          uuid primary key default gen_random_uuid(),
  tag_list_id uuid not null,
  tag_id      uuid not null references public.tags (id) on delete cascade,
  dataset_id  uuid not null references public.datasets (id) on delete cascade,
  target_type text not null check (target_type in ('dataset', 'texte', 'article', 'alinea', 'amendement')),
  source      text not null default 'manual' check (source in ('manual', 'script', 'inference')),
  confidence  real check (confidence is null or (confidence >= 0 and confidence <= 1)),
  model       text,
  created_at  timestamptz not null default now(),
  unique (tag_list_id, tag_id)
);
create index tag_links_dataset_type_idx on public.tag_links (dataset_id, target_type);
create index tag_links_tag_idx          on public.tag_links (tag_id);

-- Lecture publique seule. Les scripts écrivent avec la clé secrète, qui contourne RLS.
do $$
declare t text;
begin
  foreach t in array array['datasets', 'textes', 'articles', 'alineas', 'sorts', 'amendements', 'tags', 'tag_links']
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format('create policy "lecture publique" on public.%I for select to anon, authenticated using (true)', t);
    execute format('revoke insert, update, delete, truncate on public.%I from anon, authenticated', t);
    execute format('grant select on public.%I to anon, authenticated', t);
  end loop;
end $$;
