-- Ferme les textes de 2026 : compte des amendements, cohorte, articles par uid,
-- rattachement des amendements sans référence. Le run « textes » ne partage pas
-- la file du corpus.

create index if not exists amendements_date_depot_idx
  on raw.amendements ((payload->>'date_depot'));

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
      set ref_texte_legislatif = case
            when excluded.ref_texte_legislatif is distinct from excluded.uid then excluded.ref_texte_legislatif
            when raw.amendements.ref_texte_legislatif is distinct from raw.amendements.uid
              then raw.amendements.ref_texte_legislatif
            else excluded.ref_texte_legislatif
          end,
          texte_uid = case
            when excluded.ref_texte_legislatif is distinct from excluded.uid then excluded.texte_uid
            when raw.amendements.ref_texte_legislatif is distinct from raw.amendements.uid
              then raw.amendements.texte_uid
            else excluded.texte_uid
          end,
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

create or replace function public.raw_amendement_year_counts()
returns jsonb
language sql
stable
security definer
set search_path = raw, public, pg_temp
as $$
  select jsonb_build_object(
    '2026', count(*) filter (
      where payload->>'date_depot' >= '2026-01-01'
        and payload->>'date_depot' < '2027-01-01'
    )
  )
  from raw.amendements
  where payload->>'date_depot' >= '2026-01-01'
    and payload->>'date_depot' < '2027-01-01';
$$;

revoke all on function public.raw_amendement_year_counts() from public, anon, authenticated;
grant execute on function public.raw_amendement_year_counts() to service_role;

create or replace function public.raw_amendement_month_counts(p_year text)
returns jsonb
language plpgsql
stable
security definer
set search_path = raw, public, pg_temp
as $$
begin
  if p_year is null or p_year !~ '^[0-9]{4}$' then
    raise exception 'annee invalide';
  end if;

  return coalesce(
    (
      select jsonb_object_agg(mois, n order by mois)
      from (
        select left(payload->>'date_depot', 7) as mois, count(*) as n
        from raw.amendements
        where payload->>'date_depot' >= p_year || '-01-01'
          and payload->>'date_depot' < (p_year::int + 1)::text || '-01-01'
        group by 1
      ) months
    ),
    '{}'::jsonb
  );
end;
$$;

revoke all on function public.raw_amendement_month_counts(text) from public, anon, authenticated;
grant execute on function public.raw_amendement_month_counts(text) to service_role;

create or replace function public.raw_texte_cohort()
returns jsonb
language sql
stable
security definer
set search_path = raw, public, pg_temp
as $$
  select coalesce(jsonb_agg(uid order by uid), '[]'::jsonb)
  from raw.documents
  where payload->>'legislature' = '17'
    and payload->>'classe_libelle' in ('Projet de loi', 'Proposition de loi')
    and left(coalesce(payload->>'date_depot', payload->>'date_creation'), 4) = '2026';
$$;

revoke all on function public.raw_texte_cohort() from public, anon, authenticated;
grant execute on function public.raw_texte_cohort() to service_role;

create or replace function public.raw_latest_corpus_run()
returns jsonb
language sql
stable
security definer
set search_path = raw, public, pg_temp
as $$
  select jsonb_build_object('id', id, 'status', status)
  from raw.extract_runs
  where texte_uid = 'corpus'
  order by started_at desc
  limit 1;
$$;

revoke all on function public.raw_latest_corpus_run() from public, anon, authenticated;
grant execute on function public.raw_latest_corpus_run() to service_role;

create or replace function public.raw_begin_textes()
returns uuid
language plpgsql
security definer
set search_path = raw, public, pg_temp
as $$
declare
  v_id uuid;
begin
  insert into raw.extract_runs (texte_uid, status, counts, source)
  values (
    'textes',
    'running',
    jsonb_build_object('calls', 0, 'closed', '[]'::jsonb, 'counts', jsonb_build_object('articles_textes', 0)),
    jsonb_build_object(
      'nom', 'Assemblée nationale',
      'url', 'https://data.assemblee-nationale.fr',
      'licence', 'Licence Ouverte (Etalab)'
    )
  )
  returning id into v_id;

  return v_id;
end;
$$;

revoke all on function public.raw_begin_textes() from public, anon, authenticated;
grant execute on function public.raw_begin_textes() to service_role;

create or replace function public.raw_textes_checkpoint(p_run_id uuid, p_state jsonb)
returns void
language plpgsql
security definer
set search_path = raw, public, pg_temp
as $$
begin
  update raw.extract_runs
  set counts = coalesce(p_state, '{}'::jsonb)
  where id = p_run_id
    and texte_uid = 'textes'
    and status = 'running';

  if not found then
    raise exception 'run textes inconnu';
  end if;
end;
$$;

revoke all on function public.raw_textes_checkpoint(uuid, jsonb) from public, anon, authenticated;
grant execute on function public.raw_textes_checkpoint(uuid, jsonb) to service_role;

create or replace function public.raw_textes_state(p_run_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = raw, public, pg_temp
as $$
  select jsonb_build_object('status', status, 'state', counts)
  from raw.extract_runs
  where id = p_run_id
    and texte_uid = 'textes';
$$;

revoke all on function public.raw_textes_state(uuid) from public, anon, authenticated;
grant execute on function public.raw_textes_state(uuid) to service_role;

create or replace function public.raw_finish_textes(p_run_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = raw, public, pg_temp
as $$
declare
  v_counts jsonb;
begin
  update raw.extract_runs
  set status = 'done',
      finished_at = now()
  where id = p_run_id
    and texte_uid = 'textes'
    and status = 'running'
  returning counts into v_counts;

  if v_counts is null then
    raise exception 'run textes inconnu';
  end if;

  return v_counts;
end;
$$;

revoke all on function public.raw_finish_textes(uuid) from public, anon, authenticated;
grant execute on function public.raw_finish_textes(uuid) to service_role;

drop function if exists public.raw_pull_corpus_page(uuid, text, jsonb, integer, integer);

create or replace function public.raw_pull_corpus_page(
  p_run_id uuid,
  p_jeu text,
  p_filtres jsonb,
  p_decalage integer,
  p_slot integer default 1,
  p_tri text default null
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

  if p_slot is null or p_slot < 1 or p_slot > 8 then
    raise exception 'slot invalide';
  end if;

  if p_jeu not in ('documents', 'dossiers', 'actes', 'articles_textes', 'amendements') then
    raise exception 'jeu inconnu';
  end if;

  if p_tri is not null and p_tri not in ('uid', 'texte_uid', 'ordre') then
    raise exception 'tri inconnu';
  end if;

  if not exists (
    select 1 from raw.extract_runs
    where id = p_run_id
      and status = 'running'
      and texte_uid in ('corpus', 'textes')
  ) then
    raise exception 'run inconnu';
  end if;

  v_key := raw.hemicycle_key_slot(p_slot);
  if v_key is null then
    raise exception 'cle hemicycle absente du vault';
  end if;

  v_cursor := coalesce(
    p_tri,
    case when p_jeu = 'articles_textes' then 'texte_uid' else 'uid' end
  );

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

revoke all on function public.raw_pull_corpus_page(uuid, text, jsonb, integer, integer, text) from public, anon, authenticated;
grant execute on function public.raw_pull_corpus_page(uuid, text, jsonb, integer, integer, text) to service_role;

-- L'uid d'amendement AMANR5L17…B3434P… porte le numéro du texte quand la source
-- laisse ref_texte_legislatif vide. On ne remplace pas une référence déjà fournie.
create or replace function public.raw_link_amendement_textes()
returns jsonb
language plpgsql
security definer
set search_path = raw, public, pg_temp
as $$
declare
  v_linked int := 0;
begin
  update raw.amendements as amendement
  set ref_texte_legislatif = notice.uid,
      texte_uid = notice.uid
  from (
    select
      amendement_row.uid as amendement_uid,
      coalesce(projet.uid, proposition.uid, resolution.uid) as uid
    from raw.amendements as amendement_row
    left join raw.documents as projet
      on projet.uid = 'PRJLANR5' || substring(amendement_row.uid from 'L1[4-7]')
        || 'B' || substring(amendement_row.uid from 'B([0-9]+)P')
    left join raw.documents as proposition
      on proposition.uid = 'PIONANR5' || substring(amendement_row.uid from 'L1[4-7]')
        || 'B' || substring(amendement_row.uid from 'B([0-9]+)P')
    left join raw.documents as resolution
      on resolution.uid = 'PNREANR5' || substring(amendement_row.uid from 'L1[4-7]')
        || 'B' || substring(amendement_row.uid from 'B([0-9]+)P')
    where coalesce(amendement_row.payload->>'ref_texte_legislatif', '') = ''
      and substring(amendement_row.uid from 'B([0-9]+)P') is not null
      and left(coalesce(amendement_row.payload->>'date_depot', ''), 4) = '2026'
  ) as notice
  where amendement.uid = notice.amendement_uid
    and notice.uid is not null
    and coalesce(amendement.payload->>'ref_texte_legislatif', '') = '';

  get diagnostics v_linked = row_count;
  return jsonb_build_object('linked', v_linked);
end;
$$;

revoke all on function public.raw_link_amendement_textes() from public, anon, authenticated;
grant execute on function public.raw_link_amendement_textes() to service_role;

notify pgrst, 'reload schema';
