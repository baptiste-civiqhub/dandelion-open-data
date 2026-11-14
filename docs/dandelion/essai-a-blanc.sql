-- Essai à blanc du schéma DANDELION, en quatre parties à lancer UNE PAR APPEL, dans l'ordre.
-- Partie 1 : insère un jeu fictif. Partie 2 : sept lectures, toutes avec ok = true.
-- Partie 3 : six écritures qui doivent être refusées. Partie 4 : retire le jeu fictif.

-- ============================================================================
-- Partie 1. Jeu fictif
-- ============================================================================

-- Essai à blanc, 1 sur 4 : un jeu fictif. Tout est préfixé « essai » pour être retiré à la fin.
insert into public.datasets (slug, name) values ('essai-a-blanc', 'Essai à blanc');

insert into public.textes (dataset_id, uid, titre, slug)
select id, 'ESSAI-TXT', 'Texte d''essai', 'essai-texte' from public.datasets where slug = 'essai-a-blanc';

insert into public.articles (dataset_id, texte_id, uid, designation, ordre)
select dataset_id, id, 'ESSAI-ART3', 'Article 3', 3 from public.textes where uid = 'ESSAI-TXT';

insert into public.alineas (dataset_id, texte_id, article_id, numero)
select dataset_id, texte_id, id, 2 from public.articles where uid = 'ESSAI-ART3';

-- Amendement 12 : vise l'article 3, précise l'alinéa 2.
insert into public.amendements (dataset_id, texte_id, uid, numero_long, article_id, alinea_id, sort, rang)
select a.dataset_id, a.texte_id, 'ESSAI-A12', '12', a.id, al.id, 'retire', 1
from public.articles a join public.alineas al on al.article_id = a.id where a.uid = 'ESSAI-ART3';

-- Amendement 45 : sous-amendement du 12.
insert into public.amendements (dataset_id, texte_id, uid, numero_long, article_id, amendement_parent_id, amendement_parent, rang)
select p.dataset_id, p.texte_id, 'ESSAI-A45', '45', p.article_id, p.id, 'ESSAI-A12', 2
from public.amendements p where p.uid = 'ESSAI-A12';

-- Amendement 30 : article additionnel après l'article 3.
insert into public.amendements (dataset_id, texte_id, uid, numero_long, article_id, division_avant_apres, rang)
select dataset_id, texte_id, 'ESSAI-A30', '30', id, 'APRES', 3 from public.articles where uid = 'ESSAI-ART3';

insert into public.tags (slug, label) values ('essai-fiscalite', 'Essai fiscalité'), ('essai-budget', 'Essai budget');

-- Deux tags sur l'amendement 12, un sur l'article 3, un sur le jeu. Le tag_list_id se lit sur l'objet.
insert into public.tag_links (tag_list_id, tag_id, dataset_id, target_type, source, confidence, model)
select m.tag_list_id, t.id, m.dataset_id, 'amendement', 'inference', 0.82, 'essai'
from public.amendements m, public.tags t where m.uid = 'ESSAI-A12' and t.slug = 'essai-fiscalite';

insert into public.tag_links (tag_list_id, tag_id, dataset_id, target_type)
select m.tag_list_id, t.id, m.dataset_id, 'amendement'
from public.amendements m, public.tags t where m.uid = 'ESSAI-A12' and t.slug = 'essai-budget';

insert into public.tag_links (tag_list_id, tag_id, dataset_id, target_type, source, model)
select a.tag_list_id, t.id, a.dataset_id, 'article', 'script', 'essai'
from public.articles a, public.tags t where a.uid = 'ESSAI-ART3' and t.slug = 'essai-fiscalite';

insert into public.tag_links (tag_list_id, tag_id, dataset_id, target_type)
select d.tag_list_id, t.id, d.id, 'dataset'
from public.datasets d, public.tags t where d.slug = 'essai-a-blanc' and t.slug = 'essai-budget';

-- ============================================================================
-- Partie 2. Lectures clés
-- ============================================================================

-- Essai à blanc, 2 sur 4 : les lectures clés. Toutes les lignes doivent avoir ok = true.
with d as (select id from public.datasets where slug = 'essai-a-blanc'),
a12 as (select id, tag_list_id from public.amendements where uid = 'ESSAI-A12'),
attendu(controle, attendu) as (values
  ('01 tags de l''amendement 12, par tag_list_id', 'essai-budget, essai-fiscalite'),
  ('02 liens du jeu pour le type amendement', '2'),
  ('03 amendements qui portent essai-fiscalite', '12'),
  ('04 sous-amendements du 12', '45'),
  ('05 articles additionnels', '30'),
  ('06 liens orphelins', '0'),
  ('07 dataset_id cohérents', '0')
),
obtenu(controle, obtenu) as (
  select '01 tags de l''amendement 12, par tag_list_id', string_agg(t.slug, ', ' order by t.slug)
    from public.tag_links l join public.tags t on t.id = l.tag_id where l.tag_list_id = (select tag_list_id from a12)
  union all
  select '02 liens du jeu pour le type amendement', count(*)::text
    from public.tag_links where dataset_id = (select id from d) and target_type = 'amendement'
  union all
  select '03 amendements qui portent essai-fiscalite', string_agg(m.numero_long, ', ' order by m.rang)
    from public.amendements m
    where m.tag_list_id in (select l.tag_list_id from public.tag_links l join public.tags t on t.id = l.tag_id
                            where t.slug = 'essai-fiscalite' and l.target_type = 'amendement')
  union all
  select '04 sous-amendements du 12', string_agg(numero_long, ', ' order by rang)
    from public.amendements where amendement_parent_id = (select id from a12)
  union all
  select '05 articles additionnels', string_agg(numero_long, ', ' order by rang)
    from public.amendements where dataset_id = (select id from d) and division_avant_apres <> 'A'
  union all
  select '06 liens orphelins', count(*)::text
    from public.tag_links l
    where l.dataset_id = (select id from d) and not exists (
      select 1 from public.datasets x where x.tag_list_id = l.tag_list_id
      union all select 1 from public.textes x where x.tag_list_id = l.tag_list_id
      union all select 1 from public.articles x where x.tag_list_id = l.tag_list_id
      union all select 1 from public.alineas x where x.tag_list_id = l.tag_list_id
      union all select 1 from public.amendements x where x.tag_list_id = l.tag_list_id)
  union all
  select '07 dataset_id cohérents', count(*)::text
    from public.amendements m join public.textes x on x.id = m.texte_id where m.dataset_id <> x.dataset_id
)
select a.controle, a.attendu, o.obtenu, a.attendu = o.obtenu as ok
from attendu a left join obtenu o using (controle)
order by a.controle;

-- ============================================================================
-- Partie 3. Refus attendus
-- ============================================================================

-- Essai à blanc, 3 sur 4 : chaque écriture ci-dessous doit être refusée par une contrainte.
-- Le bloc se termine sans erreur si les six refus ont lieu. Il lève « ECHEC » dès qu'une écriture passe.
do $$
declare
  d uuid; x uuid; a12 uuid; a45 uuid; l12 uuid; tg uuid;
begin
  select id into d from public.datasets where slug = 'essai-a-blanc';
  select id into x from public.textes where uid = 'ESSAI-TXT';
  select id, tag_list_id into a12, l12 from public.amendements where uid = 'ESSAI-A12';
  select id into a45 from public.amendements where uid = 'ESSAI-A45';
  select id into tg from public.tags where slug = 'essai-fiscalite';
  if d is null or a12 is null or a45 is null or tg is null then
    raise exception 'ECHEC : jeu d''essai absent, lance d''abord la partie 1';
  end if;

  begin
    insert into public.tag_links (tag_list_id, tag_id, dataset_id, target_type) values (l12, tg, d, 'amendement');
    raise exception 'ECHEC : doublon (tag_list_id, tag_id) accepté';
  exception when unique_violation then null; end;

  begin
    insert into public.tag_links (tag_list_id, tag_id, dataset_id, target_type) values (gen_random_uuid(), tg, d, 'proposal');
    raise exception 'ECHEC : target_type inconnu accepté';
  exception when check_violation then null; end;

  begin
    insert into public.amendements (dataset_id, texte_id, uid, numero_long, division_avant_apres) values (d, x, 'ESSAI-X1', 'x1', 'CREATE');
    raise exception 'ECHEC : division_avant_apres inconnu accepté';
  exception when check_violation then null; end;

  begin
    insert into public.amendements (dataset_id, texte_id, uid, numero_long, sort) values (d, x, 'ESSAI-X2', 'x2', 'inconnu');
    raise exception 'ECHEC : sort inconnu accepté';
  exception when foreign_key_violation then null; end;

  begin
    update public.amendements set amendement_parent_id = id where id = a45;
    raise exception 'ECHEC : amendement parent de lui-même accepté';
  exception when check_violation then null; end;

  begin
    update public.amendements set tag_list_id = l12 where id = a45;
    raise exception 'ECHEC : tag_list_id partagé par deux objets accepté';
  exception when unique_violation then null; end;
end $$;

-- ============================================================================
-- Partie 4. Nettoyage
-- ============================================================================

-- Essai à blanc, 4 sur 4 : retrait du jeu fictif. La dernière requête doit rendre 0 partout.
delete from public.datasets where slug = 'essai-a-blanc';
delete from public.tags where slug like 'essai-%';

select
  (select count(*) from public.datasets    where slug like 'essai-%') as datasets,
  (select count(*) from public.textes      where uid  like 'ESSAI-%') as textes,
  (select count(*) from public.articles    where uid  like 'ESSAI-%') as articles,
  (select count(*) from public.amendements where uid  like 'ESSAI-%') as amendements,
  (select count(*) from public.tags        where slug like 'essai-%') as tags,
  (select count(*) from public.tag_links   where model = 'essai')    as tag_links_essai;
