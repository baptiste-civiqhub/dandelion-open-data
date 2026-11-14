-- Transformation raw → public : charge un texte extrait d'Hémicycle (schéma raw) dans les huit tables DANDELION.
-- Les fonctions vivent dans raw, schéma hors du modèle : public garde ses huit tables sans fonction du modèle.
-- Rejouable : chaque écriture est un upsert sur la clé métier. tag_list_id n'est jamais envoyé, donc conservé.

-- Clé de rapprochement entre la désignation d'un article (« ART. PREMIER ») et celle que cite un amendement
-- (« ART. 1 », « APRÈS ART. 9 », « Article 1 ») : sans accent, sans préfixe avant/après, « ART n ».
create or replace function raw.cle_article(p_designation text)
returns text
language sql
immutable
set search_path = ''
as $$
  select nullif(
    regexp_replace(
      regexp_replace(
        regexp_replace(
          regexp_replace(
            upper(translate(btrim(p_designation), 'àâäéèêëîïôöùûüçÀÂÄÉÈÊËÎÏÔÖÙÛÜÇ', 'aaaeeeeiioouuucAAAEEEEIIOOUUUC')),
            '\s+', ' ', 'g'),
          '^(APRES|AVANT) (L'' ?)?', ''),
        '^ART(ICLE)?\.? ?', 'ART '),
      '^ART (PREMIER|1ER)$', 'ART 1'),
    '')
$$;

-- Code de sort parmi les huit de public.sorts, depuis les libellés bruts d'Hémicycle.
-- Le sort en séance prime ; à défaut l'état (irrecevable, retiré, pas encore discuté) ; sinon « autre ».
create or replace function raw.code_sort(p_sort_en_seance text, p_etat text, p_sous_etat text)
returns text
language sql
immutable
set search_path = ''
as $$
  with n as (
    select
      lower(translate(btrim(coalesce(p_sort_en_seance, '')), 'éèêàÉÈÊÀ', 'eeeaeeea')) as s,
      lower(translate(btrim(coalesce(p_etat, '')), 'éèêàÉÈÊÀ', 'eeeaeeea')) as e,
      lower(translate(btrim(coalesce(p_sous_etat, '')), 'éèêàÉÈÊÀ', 'eeeaeeea')) as se
  )
  select case
    when s like 'adopt%' then 'adopte'
    when s like 'rejet%' then 'rejete'
    when s like 'tomb%' then 'tombe'
    when s like 'retir%' then 'retire'
    when s like 'non soutenu%' then 'non_soutenu'
    when s <> '' then 'autre'
    when e like 'irrecevable%' then 'irrecevable'
    when e like 'retir%' then 'retire'
    when e like 'tomb%' then 'tombe'
    when se like 'adopt%' then 'adopte'
    when se like 'rejet%' then 'rejete'
    when se like 'tomb%' then 'tombe'
    when se like 'retir%' then 'retire'
    when se like 'non soutenu%' then 'non_soutenu'
    when e in ('', 'a discuter', 'en traitement', 'en recevabilite') then 'en_attente'
    else 'autre'
  end
  from n
$$;

-- Charge un texte de raw dans public, sous le jeu de données p_dataset_slug (créé au besoin).
-- Rend un résumé : identifiants, comptages, amendements sans article, répartition des sorts.
create or replace function raw.charger_texte(p_texte_uid text, p_dataset_slug text, p_dataset_name text default null)
returns jsonb
language plpgsql
set search_path = ''
as $$
declare
  v_dataset_id uuid;
  v_dataset_existant uuid;
  v_texte_id uuid;
  v_document jsonb;
  v_dossier jsonb;
  v_titre text;
  v_parents integer;
begin
  if not exists (select 1 from raw.articles_textes where texte_uid = p_texte_uid)
     and not exists (select 1 from raw.amendements where texte_uid = p_texte_uid) then
    raise exception 'raw ne contient ni article ni amendement pour le texte %', p_texte_uid;
  end if;

  select dataset_id into v_dataset_existant from public.textes where uid = p_texte_uid;

  insert into public.datasets as d (slug, name)
  values (p_dataset_slug, coalesce(p_dataset_name, p_dataset_slug))
  on conflict (slug) do update
    set name = coalesce(p_dataset_name, d.name), imported_at = now()
  returning d.id into v_dataset_id;

  -- Un texte ne change pas de jeu : ses lignes filles garderaient l'ancien dataset_id.
  if v_dataset_existant is not null and v_dataset_existant <> v_dataset_id then
    raise exception 'le texte % appartient déjà à un autre jeu de données', p_texte_uid;
  end if;

  select payload into v_document from raw.documents where uid = p_texte_uid;
  select payload into v_dossier from raw.dossiers where uid = v_document->>'dossier_ref';
  v_titre := coalesce(
    nullif(v_document->>'titre_principal_court', ''),
    nullif(v_document->>'titre_principal', ''),
    nullif(v_dossier->>'titre', ''),
    p_texte_uid
  );

  -- etape_texte et organe_examen ne sont repris que s'ils sont les mêmes pour tous les amendements du texte.
  insert into public.textes (dataset_id, uid, titre, slug, legislature, etape_texte, organe_examen)
  select
    v_dataset_id,
    p_texte_uid,
    v_titre,
    lower(p_texte_uid),
    case
      when coalesce(v_document->>'legislature', s.legislature) ~ '^[0-9]+$'
      then coalesce(v_document->>'legislature', s.legislature)::smallint
    end,
    s.etape_texte,
    s.organe_examen
  from (
    select
      case when count(distinct payload->>'etape_texte') = 1 then min(payload->>'etape_texte') end as etape_texte,
      case when count(distinct payload->>'organe_examen') = 1 then min(payload->>'organe_examen') end as organe_examen,
      min(payload->>'legislature') as legislature
    from raw.amendements
    where texte_uid = p_texte_uid
  ) s
  on conflict (uid) do update
    set titre = excluded.titre,
        legislature = excluded.legislature,
        etape_texte = excluded.etape_texte,
        organe_examen = excluded.organe_examen
  returning id into v_texte_id;

  -- raw n'a pas d'identifiant d'article : uid = uid du texte + désignation.
  insert into public.articles (dataset_id, texte_id, uid, designation, titre, dispositif, ordre)
  select v_dataset_id, v_texte_id, p_texte_uid || ':' || x.designation, x.designation, x.titre, x.dispositif, x.ordre
  from (
    select distinct on (designation) designation, titre, dispositif, ordre
    from (
      select
        coalesce(nullif(btrim(payload->>'designation'), ''), 'Article sans désignation ' || ordre) as designation,
        nullif(payload->>'titre', '') as titre,
        nullif(payload->>'dispositif', '') as dispositif,
        case when ordre ~ '^[0-9]+$' then ordre::integer else 0 end as ordre
      from raw.articles_textes
      where texte_uid = p_texte_uid
    ) lignes
    order by designation, ordre
  ) x
  on conflict (uid) do update
    set designation = excluded.designation,
        titre = excluded.titre,
        dispositif = excluded.dispositif,
        ordre = excluded.ordre;

  -- Les alinéas que les amendements citent. Un amendement « avant » ou « après » un article vise un article
  -- qui n'existe pas encore : son alinéa n'appartient pas à l'article voisin.
  with cles as (
    select distinct on (raw.cle_article(designation)) raw.cle_article(designation) as cle, id
    from public.articles
    where texte_id = v_texte_id
    order by raw.cle_article(designation), ordre
  ),
  citations as (
    select
      raw.cle_article(coalesce(nullif(m.payload->>'article_designation_courte', ''), m.payload->>'division_titre')) as cle,
      case when m.payload->>'alinea_numero' ~ '^[0-9]+$' then (m.payload->>'alinea_numero')::integer end as numero,
      case when coalesce(m.payload->>'alinea_avant_apres', 'A') = 'A' then m.payload->>'alinea_designation' end as designation
    from raw.amendements m
    where m.texte_uid = p_texte_uid
      and coalesce(m.payload->>'division_avant_apres', 'A') = 'A'
  ),
  cites as (
    select c.id as article_id, x.numero, min(x.designation) as designation
    from citations x
    join cles c on c.cle = x.cle
    where x.numero is not null
    group by c.id, x.numero
  )
  insert into public.alineas (dataset_id, texte_id, article_id, numero, designation)
  select v_dataset_id, v_texte_id, article_id, numero, coalesce(designation, 'Alinéa ' || numero)
  from cites
  on conflict (article_id, numero) do update set designation = excluded.designation;

  -- rang : ordre de discussion, par organe d'examen puis par tri_amendement (clé de tri binaire d'Hémicycle).
  with cles as (
    select distinct on (raw.cle_article(designation)) raw.cle_article(designation) as cle, id
    from public.articles
    where texte_id = v_texte_id
    order by raw.cle_article(designation), ordre
  ),
  src as (
    select
      m.uid,
      m.payload as p,
      c.id as article_id,
      case
        when lower(translate(coalesce(m.payload->>'division_avant_apres', ''), 'èÈ', 'ee')) like 'apr%' then 'APRES'
        when lower(coalesce(m.payload->>'division_avant_apres', '')) like 'av%' then 'AVANT'
        else 'A'
      end as division_avant_apres,
      case when m.payload->>'alinea_numero' ~ '^[0-9]+$' then (m.payload->>'alinea_numero')::integer end as alinea_numero,
      row_number() over (
        order by m.payload->>'organe_examen' collate "C", m.payload->>'tri_amendement' collate "C", m.uid collate "C"
      ) as rang
    from raw.amendements m
    left join cles c
      on c.cle = raw.cle_article(coalesce(nullif(m.payload->>'article_designation_courte', ''), m.payload->>'division_titre'))
    where m.texte_uid = p_texte_uid
  )
  insert into public.amendements (
    dataset_id, texte_id, uid, numero_long, article_id, division_titre, division_avant_apres, alinea_id,
    amendement_parent, tri_amendement, rang, sort, sort_en_seance, etat, sous_etat, dispositif, expose_sommaire,
    signataires_affichable, acteur_ref, type_auteur, groupe_politique_ref, discussion_commune, discussion_identique,
    date_depot, date_sort, document_uri
  )
  select
    v_dataset_id,
    v_texte_id,
    s.uid,
    coalesce(nullif(s.p->>'numero_long', ''), nullif(s.p->>'numero', ''), s.uid),
    s.article_id,
    s.p->>'division_titre',
    s.division_avant_apres,
    al.id,
    nullif(s.p->>'amendement_parent', ''),
    s.p->>'tri_amendement',
    s.rang,
    raw.code_sort(s.p->>'sort_en_seance', s.p->>'etat', s.p->>'sous_etat'),
    s.p->>'sort_en_seance',
    s.p->>'etat',
    s.p->>'sous_etat',
    s.p->>'dispositif',
    s.p->>'expose_sommaire',
    s.p->>'signataires_affichable',
    s.p->>'acteur_ref',
    s.p->>'type_auteur',
    s.p->>'groupe_politique_ref',
    s.p->>'discussion_commune',
    s.p->>'discussion_identique',
    nullif(s.p->>'date_depot', '')::timestamptz,
    nullif(s.p->>'date_sort', '')::timestamptz,
    s.p->>'document_uri'
  from src s
  left join public.alineas al
    on s.division_avant_apres = 'A' and al.article_id = s.article_id and al.numero = s.alinea_numero
  on conflict (uid) do update
    set numero_long = excluded.numero_long,
        article_id = excluded.article_id,
        division_titre = excluded.division_titre,
        division_avant_apres = excluded.division_avant_apres,
        alinea_id = excluded.alinea_id,
        amendement_parent = excluded.amendement_parent,
        tri_amendement = excluded.tri_amendement,
        rang = excluded.rang,
        sort = excluded.sort,
        sort_en_seance = excluded.sort_en_seance,
        etat = excluded.etat,
        sous_etat = excluded.sous_etat,
        dispositif = excluded.dispositif,
        expose_sommaire = excluded.expose_sommaire,
        signataires_affichable = excluded.signataires_affichable,
        acteur_ref = excluded.acteur_ref,
        type_auteur = excluded.type_auteur,
        groupe_politique_ref = excluded.groupe_politique_ref,
        discussion_commune = excluded.discussion_commune,
        discussion_identique = excluded.discussion_identique,
        date_depot = excluded.date_depot,
        date_sort = excluded.date_sort,
        document_uri = excluded.document_uri;

  -- Seconde passe : le parent n'est lié que s'il est chargé. Le libellé brut reste dans amendement_parent.
  update public.amendements a
  set amendement_parent_id = p.id
  from public.amendements p
  where a.texte_id = v_texte_id
    and a.amendement_parent is not null
    and p.uid = a.amendement_parent
    and p.id <> a.id
    and a.amendement_parent_id is distinct from p.id;
  get diagnostics v_parents = row_count;

  update public.datasets d
  set perimeter = jsonb_build_object(
    'ref_texte_legislatif',
    (select jsonb_agg(t.uid order by t.uid) from public.textes t where t.dataset_id = d.id)
  )
  where d.id = v_dataset_id;

  return jsonb_build_object(
    'dataset_id', v_dataset_id,
    'texte_id', v_texte_id,
    'titre', v_titre,
    'articles', (select count(*) from public.articles where texte_id = v_texte_id),
    'alineas', (select count(*) from public.alineas where texte_id = v_texte_id),
    'amendements', (select count(*) from public.amendements where texte_id = v_texte_id),
    'amendements_sans_article', (select count(*) from public.amendements where texte_id = v_texte_id and article_id is null),
    'amendements_avec_alinea', (select count(*) from public.amendements where texte_id = v_texte_id and alinea_id is not null),
    'sous_amendements', (select count(*) from public.amendements where texte_id = v_texte_id and amendement_parent is not null),
    'parents_lies_a_cet_appel', v_parents,
    'sorts', (
      select jsonb_object_agg(sort, n)
      from (select sort, count(*) as n from public.amendements where texte_id = v_texte_id group by sort) r
    )
  );
end;
$$;

revoke all on function raw.cle_article(text) from public, anon, authenticated;
revoke all on function raw.code_sort(text, text, text) from public, anon, authenticated;
revoke all on function raw.charger_texte(text, text, text) from public, anon, authenticated;
grant execute on function raw.cle_article(text) to service_role;
grant execute on function raw.code_sort(text, text, text) to service_role;
grant execute on function raw.charger_texte(text, text, text) to service_role;
