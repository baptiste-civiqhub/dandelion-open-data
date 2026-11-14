-- Données de test pour la navigation Atlas / Area : un vocabulaire de tags de base, des tags sur le jeu réel
-- plffg-2026, et quatre zones de démonstration SANS texte (slug préfixé « demo- ») pour éprouver la recherche
-- et les filtres. Rejouable : chaque écriture est un upsert.
-- Retirer les zones de démonstration (validation humaine requise) :
--   delete from public.datasets where slug like 'demo-%';
-- Leurs liens de tags partent en cascade ; le vocabulaire `tags` reste.

insert into public.tags (slug, label, category, description) values
  ('finances-publiques', 'Finances publiques', 'theme', 'Budget de l''État, équilibre, dette'),
  ('budget',             'Budget',             'theme', 'Ouvertures et annulations de crédits'),
  ('fiscalite',          'Fiscalité',          'theme', 'Impôts, taxes, niches fiscales'),
  ('securite-sociale',   'Sécurité sociale',   'theme', 'Financement et branches de la sécurité sociale'),
  ('sante',              'Santé',              'theme', 'Système de soins, hôpital, prévention'),
  ('environnement',      'Environnement',      'theme', 'Climat, biodiversité, pollutions'),
  ('energie',            'Énergie',            'theme', 'Production, réseaux, prix de l''énergie'),
  ('education',          'Éducation',          'theme', 'École, enseignement supérieur, recherche')
on conflict (slug) do update
  set label = excluded.label, category = excluded.category, description = excluded.description;

update public.datasets
set description = 'Texte déposé le 4 novembre 2026 et ses amendements, en commission des finances puis en séance.'
where slug = 'plffg-2026' and description is null;

insert into public.datasets (slug, name, description, perimeter) values
  ('demo-plf-2027',       'Démo · Projet de loi de finances pour 2027',
   'Zone de démonstration sans données : elle sert à tester la navigation.', '{"placeholder": true}'::jsonb),
  ('demo-plfss-2027',     'Démo · Financement de la sécurité sociale pour 2027',
   'Zone de démonstration sans données : elle sert à tester la navigation.', '{"placeholder": true}'::jsonb),
  ('demo-energie-climat', 'Démo · Programmation énergie et climat',
   'Zone de démonstration sans données : elle sert à tester la navigation.', '{"placeholder": true}'::jsonb),
  ('demo-ecole',          'Démo · École et enseignement supérieur',
   'Zone de démonstration sans données : elle sert à tester la navigation.', '{"placeholder": true}'::jsonb)
on conflict (slug) do update
  set name = excluded.name, description = excluded.description, perimeter = excluded.perimeter;

-- Le tag_list_id se lit sur le jeu : il n'est jamais écrit à la main.
insert into public.tag_links (tag_list_id, tag_id, dataset_id, target_type, source, model)
select d.tag_list_id, t.id, d.id, 'dataset', 'script', 'seed-demo'
from (values
  ('plffg-2026',          'finances-publiques'),
  ('plffg-2026',          'budget'),
  ('demo-plf-2027',       'finances-publiques'),
  ('demo-plf-2027',       'budget'),
  ('demo-plf-2027',       'fiscalite'),
  ('demo-plfss-2027',     'securite-sociale'),
  ('demo-plfss-2027',     'sante'),
  ('demo-energie-climat', 'environnement'),
  ('demo-energie-climat', 'energie'),
  ('demo-ecole',          'education')
) as v(dataset_slug, tag_slug)
join public.datasets d on d.slug = v.dataset_slug
join public.tags t on t.slug = v.tag_slug
on conflict (tag_list_id, tag_id) do nothing;

select d.slug, d.id, d.name, (select count(*) from public.textes x where x.dataset_id = d.id) as textes,
       (select string_agg(t.slug, ', ' order by t.slug) from public.tag_links l join public.tags t on t.id = l.tag_id
         where l.tag_list_id = d.tag_list_id) as tags
from public.datasets d
order by d.slug;
