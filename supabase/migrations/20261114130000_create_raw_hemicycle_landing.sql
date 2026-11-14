-- Zone d'atterrissage brute, séparée du schéma public (vide de tables applicatives).
-- La pipeline de formatage lira raw.* plus tard. Ce schéma ne porte aucun renommage.

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
create index documents_extract_run_id_idx on raw.documents (extract_run_id);
create index dossiers_extract_run_id_idx on raw.dossiers (extract_run_id);
create index actes_extract_run_id_idx on raw.actes (extract_run_id);
create index articles_textes_extract_run_id_idx on raw.articles_textes (extract_run_id);
create index amendements_extract_run_id_idx on raw.amendements (extract_run_id);

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
alter default privileges in schema raw grant select on tables to anon, authenticated, service_role;

-- Appel sortant vers Hémicycle, exécuté sur le serveur Postgres. La clé ne quitte pas Vault.
create or replace function raw.hemicycle_interroger(p_key text, p_body jsonb)
returns jsonb
language plpgsql
security definer
set search_path = extensions, pg_temp
as $$
declare
  v_response extensions.http_response;
  v_status int;
  v_attempt int := 0;
begin
  perform extensions.http_set_curlopt('CURLOPT_TIMEOUT', '60');

  loop
    v_attempt := v_attempt + 1;
    select *
    into v_response
    from extensions.http((
      'POST',
      'https://api.hemicycle.ai/v1/jeux/interroger',
      array[
        extensions.http_header('Authorization', 'Bearer ' || p_key),
        extensions.http_header('Content-Type', 'application/json'),
        extensions.http_header('Hemicycle-Version', '2026-10-01')
      ],
      'application/json',
      p_body::text
    )::extensions.http_request);

    v_status := v_response.status;
    exit when v_status <> 429 or v_attempt >= 3;
    perform pg_sleep(2);
  end loop;

  if v_status <> 200 then
    raise exception 'hemicycle http %', v_status using errcode = 'external_routine_exception';
  end if;

  if v_response.content is null or btrim(v_response.content) = '' then
    raise exception 'hemicycle reponse vide' using errcode = 'external_routine_exception';
  end if;

  return v_response.content::jsonb;
end;
$$;

revoke all on function raw.hemicycle_interroger(text, jsonb) from public, anon, authenticated;

create or replace function raw.hemicycle_key()
returns text
language sql
security definer
set search_path = vault, pg_temp
as $$
  select decrypted_secret
  from vault.decrypted_secrets
  where name = 'hemicycle_api_key'
  limit 1;
$$;

revoke all on function raw.hemicycle_key() from public, anon, authenticated;

create or replace function public.raw_store_hemicycle_key(p_key text)
returns void
language plpgsql
security definer
set search_path = vault, pg_temp
as $$
declare
  v_id uuid;
begin
  if p_key is null or length(p_key) < 20 then
    raise exception 'cle hemicycle absente';
  end if;

  select id into v_id from vault.secrets where name = 'hemicycle_api_key';
  if v_id is null then
    perform vault.create_secret(p_key, 'hemicycle_api_key', 'Cle API Hemicycle pour l extrait brut');
  else
    perform vault.update_secret(v_id, p_key, 'hemicycle_api_key', 'Cle API Hemicycle pour l extrait brut');
  end if;
end;
$$;

revoke all on function public.raw_store_hemicycle_key(text) from public, anon, authenticated;
grant execute on function public.raw_store_hemicycle_key(text) to service_role;

create or replace function raw.upsert_payloads(
  p_jeu text,
  p_run uuid,
  p_texte_uid text,
  p_rows jsonb
)
returns int
language plpgsql
security definer
set search_path = raw, pg_temp
as $$
declare
  v_count int := 0;
begin
  if p_rows is null or jsonb_typeof(p_rows) <> 'array' then
    return 0;
  end if;

  if p_jeu = 'documents' then
    insert into raw.documents (uid, dossier_ref, texte_uid, extract_run_id, payload)
    select r->>'uid', r->>'dossier_ref', p_texte_uid, p_run, r
    from jsonb_array_elements(p_rows) as r
    where r->>'uid' is not null
    on conflict (uid) do update
      set dossier_ref = excluded.dossier_ref,
          texte_uid = excluded.texte_uid,
          extract_run_id = excluded.extract_run_id,
          payload = excluded.payload,
          fetched_at = now();
  elsif p_jeu = 'dossiers' then
    insert into raw.dossiers (uid, texte_uid, extract_run_id, payload)
    select r->>'uid', p_texte_uid, p_run, r
    from jsonb_array_elements(p_rows) as r
    where r->>'uid' is not null
    on conflict (uid) do update
      set texte_uid = excluded.texte_uid,
          extract_run_id = excluded.extract_run_id,
          payload = excluded.payload,
          fetched_at = now();
  elsif p_jeu = 'actes' then
    insert into raw.actes (uid, dossier_ref, texte_uid, extract_run_id, payload)
    select r->>'uid', r->>'dossier_ref', p_texte_uid, p_run, r
    from jsonb_array_elements(p_rows) as r
    where r->>'uid' is not null and r->>'dossier_ref' is not null
    on conflict (uid) do update
      set dossier_ref = excluded.dossier_ref,
          texte_uid = excluded.texte_uid,
          extract_run_id = excluded.extract_run_id,
          payload = excluded.payload,
          fetched_at = now();
  elsif p_jeu = 'articles_textes' then
    insert into raw.articles_textes (texte_uid, ordre, extract_run_id, payload)
    select p_texte_uid, coalesce(nullif(r->>'ordre', ''), n::text), p_run, r
    from jsonb_array_elements(p_rows) with ordinality as t(r, n)
    on conflict (texte_uid, ordre) do update
      set extract_run_id = excluded.extract_run_id,
          payload = excluded.payload,
          fetched_at = now();
  elsif p_jeu = 'amendements' then
    insert into raw.amendements (uid, ref_texte_legislatif, texte_uid, extract_run_id, payload)
    select r->>'uid', coalesce(r->>'ref_texte_legislatif', p_texte_uid), p_texte_uid, p_run, r
    from jsonb_array_elements(p_rows) as r
    where r->>'uid' is not null
    on conflict (uid) do update
      set ref_texte_legislatif = excluded.ref_texte_legislatif,
          texte_uid = excluded.texte_uid,
          extract_run_id = excluded.extract_run_id,
          payload = excluded.payload,
          fetched_at = now();
  else
    raise exception 'jeu inconnu';
  end if;

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

revoke all on function raw.upsert_payloads(text, uuid, text, jsonb) from public, anon, authenticated;

create or replace function public.raw_begin_extract(p_texte_uid text)
returns jsonb
language plpgsql
security definer
set search_path = raw, public, pg_temp
as $$
declare
  v_key text;
  v_run uuid;
  v_resp jsonb;
  v_rows jsonb;
  v_dossier text;
  v_docs int;
  v_dossiers int := 0;
  v_actes int := 0;
  v_articles int := 0;
begin
  if p_texte_uid is null or btrim(p_texte_uid) = '' then
    raise exception 'texte_uid manquant';
  end if;

  v_key := raw.hemicycle_key();
  if v_key is null then
    raise exception 'cle hemicycle absente du vault';
  end if;

  insert into raw.extract_runs (texte_uid, status)
  values (p_texte_uid, 'running')
  returning id into v_run;

  v_resp := raw.hemicycle_interroger(
    v_key,
    jsonb_build_object(
      'jeu', 'documents',
      'filtres', jsonb_build_array(jsonb_build_object('colonne', 'uid', 'op', 'eq', 'valeur', p_texte_uid)),
      'limite', 5
    )
  );
  v_rows := coalesce(v_resp->'lignes', '[]'::jsonb);
  if jsonb_array_length(v_rows) = 0 then
    raise exception 'texte introuvable';
  end if;

  v_docs := raw.upsert_payloads('documents', v_run, p_texte_uid, v_rows);
  v_dossier := v_rows->0->>'dossier_ref';

  update raw.extract_runs
  set source = v_resp->'source',
      dossier_uid = v_dossier
  where id = v_run;

  if v_dossier is not null then
    v_resp := raw.hemicycle_interroger(
      v_key,
      jsonb_build_object(
        'jeu', 'dossiers',
        'filtres', jsonb_build_array(jsonb_build_object('colonne', 'uid', 'op', 'eq', 'valeur', v_dossier)),
        'limite', 5
      )
    );
    v_dossiers := raw.upsert_payloads('dossiers', v_run, p_texte_uid, coalesce(v_resp->'lignes', '[]'::jsonb));

    v_resp := raw.hemicycle_interroger(
      v_key,
      jsonb_build_object(
        'jeu', 'actes',
        'filtres', jsonb_build_array(jsonb_build_object('colonne', 'dossier_ref', 'op', 'eq', 'valeur', v_dossier)),
        'limite', 200
      )
    );
    v_actes := raw.upsert_payloads('actes', v_run, p_texte_uid, coalesce(v_resp->'lignes', '[]'::jsonb));
  end if;

  v_resp := raw.hemicycle_interroger(
    v_key,
    jsonb_build_object(
      'jeu', 'articles_textes',
      'filtres', jsonb_build_array(jsonb_build_object('colonne', 'texte_uid', 'op', 'eq', 'valeur', p_texte_uid)),
      'limite', 200
    )
  );
  v_articles := raw.upsert_payloads('articles_textes', v_run, p_texte_uid, coalesce(v_resp->'lignes', '[]'::jsonb));

  return jsonb_build_object(
    'run_id', v_run,
    'texte_uid', p_texte_uid,
    'dossier_uid', v_dossier,
    'documents', v_docs,
    'dossiers', v_dossiers,
    'actes', v_actes,
    'articles', v_articles
  );
end;
$$;

revoke all on function public.raw_begin_extract(text) from public, anon, authenticated;
grant execute on function public.raw_begin_extract(text) to service_role;

create or replace function public.raw_pull_amendements(p_run_id uuid, p_decalage integer)
returns jsonb
language plpgsql
security definer
set search_path = raw, public, pg_temp
as $$
declare
  v_key text;
  v_texte text;
  v_resp jsonb;
  v_rows jsonb;
  v_fetched int;
  v_limit int := 100;
begin
  if p_decalage is null or p_decalage < 0 then
    raise exception 'decalage invalide';
  end if;

  select texte_uid into v_texte from raw.extract_runs where id = p_run_id;
  if v_texte is null then
    raise exception 'run inconnu';
  end if;

  v_key := raw.hemicycle_key();
  if v_key is null then
    raise exception 'cle hemicycle absente du vault';
  end if;

  v_resp := raw.hemicycle_interroger(
    v_key,
    jsonb_build_object(
      'jeu', 'amendements',
      'filtres', jsonb_build_array(
        jsonb_build_object('colonne', 'ref_texte_legislatif', 'op', 'eq', 'valeur', v_texte)
      ),
      'tri', 'uid',
      'ordre', 'asc',
      'limite', v_limit,
      'decalage', p_decalage
    )
  );
  v_rows := coalesce(v_resp->'lignes', '[]'::jsonb);
  v_fetched := raw.upsert_payloads('amendements', p_run_id, v_texte, v_rows);

  return jsonb_build_object(
    'fetched', v_fetched,
    'next_decalage', p_decalage + v_fetched,
    'done', v_fetched < v_limit
  );
end;
$$;

revoke all on function public.raw_pull_amendements(uuid, integer) from public, anon, authenticated;
grant execute on function public.raw_pull_amendements(uuid, integer) to service_role;

create or replace function public.raw_finish_extract(p_run_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = raw, public, pg_temp
as $$
declare
  v_texte text;
  v_dossier text;
  v_counts jsonb;
begin
  select texte_uid, dossier_uid into v_texte, v_dossier
  from raw.extract_runs
  where id = p_run_id;

  if v_texte is null then
    raise exception 'run inconnu';
  end if;

  v_counts := jsonb_build_object(
    'documents', (select count(*) from raw.documents where texte_uid = v_texte),
    'dossiers', (select count(*) from raw.dossiers where texte_uid = v_texte),
    'actes', (select count(*) from raw.actes where texte_uid = v_texte),
    'articles', (select count(*) from raw.articles_textes where texte_uid = v_texte),
    'amendements', (select count(*) from raw.amendements where texte_uid = v_texte)
  );

  update raw.extract_runs
  set status = 'done',
      counts = v_counts,
      finished_at = now(),
      error = null
  where id = p_run_id;

  return jsonb_build_object(
    'run_id', p_run_id,
    'texte_uid', v_texte,
    'dossier_uid', v_dossier,
    'counts', v_counts
  );
end;
$$;

revoke all on function public.raw_finish_extract(uuid) from public, anon, authenticated;
grant execute on function public.raw_finish_extract(uuid) to service_role;

create or replace function public.fetch_raw_summary(p_texte_uid text)
returns jsonb
language sql
stable
security invoker
set search_path = raw, public, pg_temp
as $$
  select jsonb_build_object(
    'texte_uid', d.texte_uid,
    'titre', d.payload->>'titre_principal',
    'dossier_uid', d.dossier_ref,
    'counts', jsonb_build_object(
      'documents', (select count(*) from raw.documents where texte_uid = d.texte_uid),
      'dossiers', (select count(*) from raw.dossiers where texte_uid = d.texte_uid),
      'actes', (select count(*) from raw.actes where texte_uid = d.texte_uid),
      'articles', (select count(*) from raw.articles_textes where texte_uid = d.texte_uid),
      'amendements', (select count(*) from raw.amendements where texte_uid = d.texte_uid)
    ),
    'source_nom', r.source->>'nom',
    'source_url', r.source->>'url',
    'licence', r.source->>'licence',
    'status', r.status,
    'finished_at', r.finished_at
  )
  from raw.documents d
  left join lateral (
    select source, status, finished_at
    from raw.extract_runs
    where texte_uid = d.texte_uid
    order by started_at desc
    limit 1
  ) r on true
  where d.uid = p_texte_uid;
$$;

revoke all on function public.fetch_raw_summary(text) from public;
grant execute on function public.fetch_raw_summary(text) to anon, authenticated, service_role;

create or replace function public.fetch_raw_rows(
  p_jeu text,
  p_texte_uid text,
  p_limit integer default 100,
  p_offset integer default 0
)
returns jsonb
language plpgsql
stable
security invoker
set search_path = raw, public, pg_temp
as $$
declare
  v_limit int := least(greatest(coalesce(p_limit, 100), 1), 200);
  v_offset int := greatest(coalesce(p_offset, 0), 0);
  v_total int;
  v_rows jsonb;
begin
  if p_jeu = 'documents' then
    select count(*) into v_total from raw.documents where texte_uid = p_texte_uid;
    select coalesce(jsonb_agg(payload order by uid), '[]'::jsonb) into v_rows
    from (
      select payload, uid from raw.documents
      where texte_uid = p_texte_uid
      order by uid
      limit v_limit offset v_offset
    ) page;
  elsif p_jeu = 'dossiers' then
    select count(*) into v_total from raw.dossiers where texte_uid = p_texte_uid;
    select coalesce(jsonb_agg(payload order by uid), '[]'::jsonb) into v_rows
    from (
      select payload, uid from raw.dossiers
      where texte_uid = p_texte_uid
      order by uid
      limit v_limit offset v_offset
    ) page;
  elsif p_jeu = 'actes' then
    select count(*) into v_total from raw.actes where texte_uid = p_texte_uid;
    select coalesce(jsonb_agg(payload order by uid), '[]'::jsonb) into v_rows
    from (
      select payload, uid from raw.actes
      where texte_uid = p_texte_uid
      order by uid
      limit v_limit offset v_offset
    ) page;
  elsif p_jeu = 'articles_textes' then
    select count(*) into v_total from raw.articles_textes where texte_uid = p_texte_uid;
    select coalesce(jsonb_agg(payload order by ordre), '[]'::jsonb) into v_rows
    from (
      select payload, ordre from raw.articles_textes
      where texte_uid = p_texte_uid
      order by ordre
      limit v_limit offset v_offset
    ) page;
  elsif p_jeu = 'amendements' then
    select count(*) into v_total from raw.amendements where texte_uid = p_texte_uid;
    select coalesce(jsonb_agg(payload order by uid), '[]'::jsonb) into v_rows
    from (
      select payload, uid from raw.amendements
      where texte_uid = p_texte_uid
      order by uid
      limit v_limit offset v_offset
    ) page;
  else
    raise exception 'jeu inconnu';
  end if;

  return jsonb_build_object('rows', v_rows, 'total', v_total);
end;
$$;

revoke all on function public.fetch_raw_rows(text, text, integer, integer) from public;
grant execute on function public.fetch_raw_rows(text, text, integer, integer) to anon, authenticated, service_role;
