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

revoke all on function raw.hemicycle_interroger(text, jsonb) from public;

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

revoke all on function raw.hemicycle_key() from public;

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

revoke all on function public.raw_store_hemicycle_key(text) from public;
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

revoke all on function raw.upsert_payloads(text, uuid, text, jsonb) from public;;
