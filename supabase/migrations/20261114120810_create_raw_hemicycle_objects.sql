create schema if not exists raw;

comment on schema raw is
  'Atterrissage brut Hémicycle. La pipeline de formatage part de ces tables et écrit ailleurs.';

create extension if not exists http with schema extensions;

create table raw.extract_runs (
  id uuid primary key default gen_random_uuid(),
  texte_uid text not null,
  dossier_uid text,
  status text not null,
  source jsonb,
  counts jsonb not null default '{}'::jsonb,
  error text,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  constraint extract_runs_status_check check (status in ('running', 'done', 'error'))
);

create index extract_runs_texte_uid_idx on raw.extract_runs (texte_uid);

comment on table raw.extract_runs is 'Une exécution d''extrait pour un texte. Les lignes brutes pointent vers ce run.';

create table raw.documents (
  uid text primary key,
  dossier_ref text,
  texte_uid text not null,
  extract_run_id uuid not null references raw.extract_runs (id),
  payload jsonb not null,
  fetched_at timestamptz not null default now()
);

create index documents_dossier_ref_idx on raw.documents (dossier_ref);
create index documents_texte_uid_idx on raw.documents (texte_uid);

create table raw.dossiers (
  uid text primary key,
  texte_uid text not null,
  extract_run_id uuid not null references raw.extract_runs (id),
  payload jsonb not null,
  fetched_at timestamptz not null default now()
);

create index dossiers_texte_uid_idx on raw.dossiers (texte_uid);

create table raw.actes (
  uid text primary key,
  dossier_ref text not null,
  texte_uid text not null,
  extract_run_id uuid not null references raw.extract_runs (id),
  payload jsonb not null,
  fetched_at timestamptz not null default now()
);

create index actes_dossier_ref_idx on raw.actes (dossier_ref);
create index actes_texte_uid_idx on raw.actes (texte_uid);

create table raw.articles_textes (
  texte_uid text not null,
  ordre text not null,
  extract_run_id uuid not null references raw.extract_runs (id),
  payload jsonb not null,
  fetched_at timestamptz not null default now(),
  primary key (texte_uid, ordre)
);

create table raw.amendements (
  uid text primary key,
  ref_texte_legislatif text not null,
  texte_uid text not null,
  extract_run_id uuid not null references raw.extract_runs (id),
  payload jsonb not null,
  fetched_at timestamptz not null default now()
);

create index amendements_texte_uid_idx on raw.amendements (texte_uid);
create index amendements_ref_texte_idx on raw.amendements (ref_texte_legislatif);

alter table raw.extract_runs enable row level security;
alter table raw.documents enable row level security;
alter table raw.dossiers enable row level security;
alter table raw.actes enable row level security;
alter table raw.articles_textes enable row level security;
alter table raw.amendements enable row level security;

create policy "Lecture publique" on raw.extract_runs for select to anon, authenticated using (true);
create policy "Lecture publique" on raw.documents for select to anon, authenticated using (true);
create policy "Lecture publique" on raw.dossiers for select to anon, authenticated using (true);
create policy "Lecture publique" on raw.actes for select to anon, authenticated using (true);
create policy "Lecture publique" on raw.articles_textes for select to anon, authenticated using (true);
create policy "Lecture publique" on raw.amendements for select to anon, authenticated using (true);

revoke all on schema raw from public;
grant usage on schema raw to anon, authenticated, service_role;
grant select on all tables in schema raw to anon, authenticated, service_role;
grant insert, update, delete on all tables in schema raw to service_role;
alter default privileges in schema raw grant select on tables to anon, authenticated, service_role;;
