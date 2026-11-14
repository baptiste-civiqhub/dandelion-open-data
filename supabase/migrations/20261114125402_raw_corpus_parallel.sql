create or replace function raw.hemicycle_key_slot(p_slot integer)
returns text
language sql
security definer
set search_path = vault, pg_temp
as $$
  select decrypted_secret
  from vault.decrypted_secrets
  where name = case
    when p_slot is null or p_slot <= 1 then 'hemicycle_api_key'
    else 'hemicycle_api_key_' || p_slot::text
  end
  limit 1;
$$;

revoke all on function raw.hemicycle_key_slot(integer) from public, anon, authenticated;

create or replace function public.raw_store_hemicycle_key_slot(p_slot integer, p_key text)
returns void
language plpgsql
security definer
set search_path = vault, pg_temp
as $$
declare
  v_name text;
  v_id uuid;
begin
  if p_slot is null or p_slot < 1 or p_slot > 8 then
    raise exception 'slot invalide';
  end if;

  if p_key is null or length(p_key) < 20 then
    raise exception 'cle hemicycle absente';
  end if;

  v_name := case
    when p_slot = 1 then 'hemicycle_api_key'
    else 'hemicycle_api_key_' || p_slot::text
  end;

  select id into v_id from vault.secrets where name = v_name;
  if v_id is null then
    perform vault.create_secret(p_key, v_name, 'Cle API Hemicycle pour l extrait brut');
  else
    perform vault.update_secret(v_id, p_key, v_name, 'Cle API Hemicycle pour l extrait brut');
  end if;
end;
$$;

revoke all on function public.raw_store_hemicycle_key_slot(integer, text) from public, anon, authenticated;
grant execute on function public.raw_store_hemicycle_key_slot(integer, text) to service_role;

drop function if exists public.raw_pull_corpus_page(uuid, text, jsonb, integer);

create or replace function public.raw_pull_corpus_page(
  p_run_id uuid,
  p_jeu text,
  p_filtres jsonb,
  p_decalage integer,
  p_slot integer default 1
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

  if not exists (
    select 1 from raw.extract_runs
    where id = p_run_id and texte_uid = 'corpus' and status = 'running'
  ) then
    raise exception 'run corpus inconnu';
  end if;

  v_key := raw.hemicycle_key_slot(p_slot);
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

revoke all on function public.raw_pull_corpus_page(uuid, text, jsonb, integer, integer) from public, anon, authenticated;
grant execute on function public.raw_pull_corpus_page(uuid, text, jsonb, integer, integer) to service_role;
;
