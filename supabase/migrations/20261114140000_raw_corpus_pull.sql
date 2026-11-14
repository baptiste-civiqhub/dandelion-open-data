-- Chargement brut de tout le corpus (cinq jeux), une page HTTP par appel.
-- Le script scripts/extract-raw-corpus.mjs enchaîne les pages. Les payloads restent sur Postgres.

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
  v_texte text := nullif(p_texte_uid, '');
begin
  if p_rows is null or jsonb_typeof(p_rows) <> 'array' then
    return 0;
  end if;

  if p_jeu = 'documents' then
    insert into raw.documents (uid, dossier_ref, texte_uid, extract_run_id, payload)
    select r->>'uid', r->>'dossier_ref', coalesce(v_texte, r->>'uid'), p_run, r
    from jsonb_array_elements(p_rows) as r
    where r->>'uid' is not null
    on conflict (uid) do update
      set dossier_ref = excluded.dossier_ref,
          texte_uid = case when v_texte is null then raw.documents.texte_uid else excluded.texte_uid end,
          extract_run_id = excluded.extract_run_id,
          payload = excluded.payload,
          fetched_at = now();
  elsif p_jeu = 'dossiers' then
    insert into raw.dossiers (uid, texte_uid, extract_run_id, payload)
    select r->>'uid', coalesce(v_texte, r->>'uid'), p_run, r
    from jsonb_array_elements(p_rows) as r
    where r->>'uid' is not null
    on conflict (uid) do update
      set texte_uid = case when v_texte is null then raw.dossiers.texte_uid else excluded.texte_uid end,
          extract_run_id = excluded.extract_run_id,
          payload = excluded.payload,
          fetched_at = now();
  elsif p_jeu = 'actes' then
    insert into raw.actes (uid, dossier_ref, texte_uid, extract_run_id, payload)
    select
      r->>'uid',
      r->>'dossier_ref',
      coalesce(v_texte, nullif(r->>'texte_associe', ''), r->>'dossier_ref'),
      p_run,
      r
    from jsonb_array_elements(p_rows) as r
    where r->>'uid' is not null and r->>'dossier_ref' is not null
    on conflict (uid) do update
      set dossier_ref = excluded.dossier_ref,
          texte_uid = case when v_texte is null then raw.actes.texte_uid else excluded.texte_uid end,
          extract_run_id = excluded.extract_run_id,
          payload = excluded.payload,
          fetched_at = now();
  elsif p_jeu = 'articles_textes' then
    insert into raw.articles_textes (texte_uid, ordre, extract_run_id, payload)
    select
      coalesce(v_texte, r->>'texte_uid'),
      coalesce(nullif(r->>'ordre', ''), n::text),
      p_run,
      r
    from jsonb_array_elements(p_rows) with ordinality as t(r, n)
    where coalesce(v_texte, r->>'texte_uid') is not null
    on conflict (texte_uid, ordre) do update
      set extract_run_id = excluded.extract_run_id,
          payload = excluded.payload,
          fetched_at = now();
  elsif p_jeu = 'amendements' then
    insert into raw.amendements (uid, ref_texte_legislatif, texte_uid, extract_run_id, payload)
    select
      r->>'uid',
      coalesce(nullif(r->>'ref_texte_legislatif', ''), v_texte, r->>'uid'),
      coalesce(v_texte, nullif(r->>'ref_texte_legislatif', ''), r->>'uid'),
      p_run,
      r
    from jsonb_array_elements(p_rows) as r
    where r->>'uid' is not null
    on conflict (uid) do update
      set ref_texte_legislatif = excluded.ref_texte_legislatif,
          texte_uid = case when v_texte is null then raw.amendements.texte_uid else excluded.texte_uid end,
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

create or replace function public.raw_begin_corpus()
returns uuid
language plpgsql
security definer
set search_path = raw, public, pg_temp
as $$
declare
  v_id uuid;
begin
  insert into raw.extract_runs (texte_uid, status, source)
  values (
    'corpus',
    'running',
    jsonb_build_object(
      'nom', 'Assemblée nationale',
      'url', 'https://data.assemblee-nationale.fr',
      'licence', 'Licence Ouverte (Etalab)',
      'licence_url', 'https://data.assemblee-nationale.fr/licence-ouverte-open-licence'
    )
  )
  returning id into v_id;

  return v_id;
end;
$$;

revoke all on function public.raw_begin_corpus() from public, anon, authenticated;
grant execute on function public.raw_begin_corpus() to service_role;

create or replace function public.raw_corpus_checkpoint(p_run_id uuid, p_state jsonb)
returns void
language plpgsql
security definer
set search_path = raw, public, pg_temp
as $$
begin
  update raw.extract_runs
  set counts = coalesce(p_state, '{}'::jsonb)
  where id = p_run_id
    and texte_uid = 'corpus'
    and status = 'running';

  if not found then
    raise exception 'run corpus inconnu';
  end if;
end;
$$;

revoke all on function public.raw_corpus_checkpoint(uuid, jsonb) from public, anon, authenticated;
grant execute on function public.raw_corpus_checkpoint(uuid, jsonb) to service_role;

create or replace function public.raw_corpus_state(p_run_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = raw, public, pg_temp
as $$
  select jsonb_build_object('status', status, 'state', counts)
  from raw.extract_runs
  where id = p_run_id
    and texte_uid = 'corpus';
$$;

revoke all on function public.raw_corpus_state(uuid) from public, anon, authenticated;
grant execute on function public.raw_corpus_state(uuid) to service_role;

create or replace function public.raw_pull_corpus_page(
  p_run_id uuid,
  p_jeu text,
  p_filtres jsonb,
  p_decalage integer
)
returns jsonb
language plpgsql
security definer
set search_path = raw, public, pg_temp
as $$
declare
  v_key text;
  v_resp jsonb;
  v_rows jsonb;
  v_fetched int;
  v_last jsonb;
  v_cursor text;
begin
  if p_decalage is null or p_decalage < 0 or p_decalage > 10000 then
    raise exception 'decalage invalide';
  end if;

  if p_jeu not in ('documents', 'dossiers', 'actes', 'articles_textes', 'amendements') then
    raise exception 'jeu inconnu';
  end if;

  if not exists (
    select 1 from raw.extract_runs
    where id = p_run_id and texte_uid = 'corpus' and status = 'running'
  ) then
    raise exception 'run corpus inconnu';
  end if;

  v_key := raw.hemicycle_key();
  if v_key is null then
    raise exception 'cle hemicycle absente du vault';
  end if;

  v_cursor := case when p_jeu = 'articles_textes' then 'texte_uid' else 'uid' end;

  v_resp := raw.hemicycle_interroger(
    v_key,
    jsonb_build_object(
      'jeu', p_jeu,
      'filtres', coalesce(p_filtres, '[]'::jsonb),
      'tri', v_cursor,
      'ordre', 'asc',
      'limite', 200,
      'decalage', p_decalage
    )
  );

  v_rows := coalesce(v_resp->'lignes', '[]'::jsonb);
  v_fetched := raw.upsert_payloads(p_jeu, p_run_id, null, v_rows);

  v_last := case
    when jsonb_array_length(v_rows) = 0 then null
    else v_rows->(jsonb_array_length(v_rows) - 1)
  end;

  return jsonb_build_object(
    'fetched', v_fetched,
    'key', v_last->>v_cursor,
    'ceiling', v_resp->>'pagination' is not null
  );
end;
$$;

revoke all on function public.raw_pull_corpus_page(uuid, text, jsonb, integer) from public, anon, authenticated;
grant execute on function public.raw_pull_corpus_page(uuid, text, jsonb, integer) to service_role;

create or replace function public.raw_finish_corpus(p_run_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = raw, public, pg_temp
as $$
declare
  v_counts jsonb;
  v_calls int;
begin
  select coalesce((counts->>'calls')::int, 0)
  into v_calls
  from raw.extract_runs
  where id = p_run_id and texte_uid = 'corpus' and status = 'running';

  if v_calls is null then
    raise exception 'run corpus inconnu';
  end if;

  v_counts := jsonb_build_object(
    'documents', (select count(*) from raw.documents where extract_run_id = p_run_id),
    'dossiers', (select count(*) from raw.dossiers where extract_run_id = p_run_id),
    'actes', (select count(*) from raw.actes where extract_run_id = p_run_id),
    'articles_textes', (select count(*) from raw.articles_textes where extract_run_id = p_run_id),
    'amendements', (select count(*) from raw.amendements where extract_run_id = p_run_id),
    'calls', v_calls
  );

  update raw.extract_runs
  set status = 'done',
      counts = v_counts,
      finished_at = now(),
      error = null
  where id = p_run_id;

  return v_counts;
end;
$$;

revoke all on function public.raw_finish_corpus(uuid) from public, anon, authenticated;
grant execute on function public.raw_finish_corpus(uuid) to service_role;
