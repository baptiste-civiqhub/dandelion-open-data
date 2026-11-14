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
grant execute on function public.fetch_raw_summary(text) to anon, authenticated, service_role;;
