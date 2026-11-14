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

revoke all on function public.raw_begin_extract(text) from public;
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

revoke all on function public.raw_pull_amendements(uuid, integer) from public;
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

revoke all on function public.raw_finish_extract(uuid) from public;
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
    'counts', coalesce(r.counts, '{}'::jsonb),
    'source_nom', r.source->>'nom',
    'source_url', r.source->>'url',
    'licence', r.source->>'licence',
    'status', r.status,
    'finished_at', r.finished_at
  )
  from raw.documents d
  left join lateral (
    select source, counts, status, finished_at
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
grant execute on function public.fetch_raw_rows(text, text, integer, integer) to anon, authenticated, service_role;;
