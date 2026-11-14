-- PostgREST ouvre la session en tant qu'authenticator (statement_timeout = 8s),
-- puis fait SET ROLE service_role : le délai de 8s reste armé. raw_pull_corpus_page
-- dépasse ce délai (HTTP synchrone + upsert). Postgres annule alors la requête,
-- ce qui coupe l'appel HTTP et laisse le warning « resource was not closed: TupleDesc ».
-- Le SET sur la fonction réarme le délai pour cet appel seulement.
-- pgsql-http 1.6 impose CURLOPT_CONNECTTIMEOUT = 1 avant les options de session :
-- sans override, le DNS et le TCP vers Hémicycle expirent sous la charge.

drop function if exists public._timeout_probe();

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
  perform extensions.http_set_curlopt('CURLOPT_CONNECTTIMEOUT', '10');
  perform extensions.http_set_curlopt('CURLOPT_TIMEOUT', '40');

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

alter function public.raw_pull_corpus_page(uuid, text, jsonb, integer, integer)
  set statement_timeout = '50s';

alter function public.raw_pull_amendements(uuid, integer)
  set statement_timeout = '50s';

alter function public.raw_begin_extract(text)
  set statement_timeout = '120s';

revoke all on function public.rls_auto_enable() from public, anon, authenticated;
