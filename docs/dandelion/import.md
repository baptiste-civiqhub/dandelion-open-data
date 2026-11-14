# Charger un texte de `raw` vers les huit tables

Les données arrivent en deux temps. L'extraction interroge l'API Hémicycle et dépose les réponses brutes dans le schéma `raw` (une ligne par objet, le JSON d'origine dans `payload`). La transformation décrite ici lit `raw` et remplit les huit tables de [`schema.md`](schema.md), celles que le front-end lit.

## La fonction

```sql
select raw.charger_texte(
  'PRJLANR5L17B3434',                                       -- uid du texte dans raw
  'plffg-2026',                                             -- slug du jeu de données, créé s'il n'existe pas
  'Projet de loi de finances de fin de gestion pour 2026'   -- nom du jeu, facultatif après le premier appel
);
```

- **Où** : schéma `raw`, migration `20261114140219_raw_charger_texte`. Le schéma `public` garde ses huit tables sans fonction du modèle.
- **Qui** : `postgres` et `service_role`. `anon` et `authenticated` n'ont pas le droit de l'exécuter.
- **Comment la lancer** : `pnpm exec supabase db query --remote "select raw.charger_texte(...)"`, ou l'outil MCP `execute_sql`.
- **Rejouable** : chaque écriture est un upsert sur la clé métier (`slug`, `uid`, ou `article_id` + `numero`). Un second appel met à jour sans créer de doublon et conserve les `tag_list_id`, donc les tags déjà posés.
- **Un jeu peut contenir plusieurs textes** : rappeler la fonction avec le même slug et un autre uid. Un texte ne change pas de jeu : la fonction refuse.

Elle rend un résumé à lire avant d'aller plus loin :

```json
{
  "titre": "Projet de loi de finances de fin de gestion pour 2026",
  "articles": 10,
  "alineas": 9,
  "amendements": 217,
  "amendements_sans_article": 0,
  "amendements_avec_alinea": 35,
  "sous_amendements": 0,
  "parents_lies_a_cet_appel": 0,
  "sorts": { "adopte": 72, "rejete": 111, "tombe": 11, "retire": 4, "non_soutenu": 6, "irrecevable": 13 }
}
```

C'est le résultat réel du texte pilote, chargé le 14 novembre 2026 (identifiants omis).

## Règles de transformation

| Cible                                 | Source dans `raw`                                       | Règle                                                                                |
| ------------------------------------- | ------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| `textes.titre`                        | `documents.payload`                                     | `titre_principal_court`, à défaut `titre_principal`, à défaut le titre du dossier    |
| `textes.slug`                         | uid du texte                                            | l'uid en minuscules                                                                  |
| `textes.etape_texte`, `organe_examen` | `amendements.payload`                                   | repris seulement si tous les amendements du texte portent la même valeur, sinon vide |
| `articles.uid`                        | `articles_textes`                                       | uid du texte + `:` + `designation` (raw n'a pas d'identifiant d'article)             |
| `alineas`                             | `amendements.payload`                                   | une ligne par alinéa cité (`alinea_numero`) ; `dispositif` reste vide                |
| `amendements.article_id`              | `article_designation_courte`, à défaut `division_titre` | rapprochée de `articles.designation` par `raw.cle_article`                           |
| `amendements.division_avant_apres`    | `division_avant_apres`                                  | `Après` → `APRES`, `Avant` → `AVANT`, le reste → `A`                                 |
| `amendements.alinea_id`               | `alinea_numero`                                         | seulement si l'amendement vise l'article lui-même (`A`)                              |
| `amendements.rang`                    | `organe_examen`, `tri_amendement`                       | numérotation continue : par organe d'examen, puis par `tri_amendement`               |
| `amendements.sort`                    | `sort_en_seance`, `etat`, `sous_etat`                   | `raw.code_sort`, voir plus bas                                                       |
| `amendements.amendement_parent_id`    | `amendement_parent`                                     | seconde passe : lié si un amendement chargé porte cet uid                            |
| autres colonnes d'`amendements`       | clé de même nom dans `payload`                          | recopiées telles quelles                                                             |

### Rapprocher un amendement de son article

`division_titre` ne suffit pas. Sur le texte pilote, 149 amendements ont `division_titre = "ETAT B"` (une annexe) alors qu'ils visent l'article 5 : c'est `article_designation_courte` (`ART. 5`) qui le dit. Les deux côtés n'écrivent pas non plus la même chose (`ART. 1` contre `ART. PREMIER`, `APRÈS ART. 9` pour un article additionnel). `raw.cle_article` ramène tout à une même clé :

| Entrée                                | Clé             |
| ------------------------------------- | --------------- |
| `ART. PREMIER`, `ART. 1`, `Article 1` | `ART 1`         |
| `APRÈS ART. 9`                        | `ART 9`         |
| `ART. LIMINAIRE`, `Article liminaire` | `ART LIMINAIRE` |
| `ART. 2 BIS`                          | `ART 2 BIS`     |

Un amendement sans article correspondant garde `article_id` vide ; le résumé les compte dans `amendements_sans_article`.

### Normaliser le sort

Le sort en séance prime. À défaut, l'état tranche. Tout libellé non reconnu donne `autre`, à vérifier.

| `sort_en_seance` | `etat`                                | Code          |
| ---------------- | ------------------------------------- | ------------- |
| `Adopté`         |                                       | `adopte`      |
| `Rejeté`         |                                       | `rejete`      |
| `Tombé`          |                                       | `tombe`       |
| `Retiré`         |                                       | `retire`      |
| `Non soutenu`    |                                       | `non_soutenu` |
| vide             | `Irrecevable`, `Irrecevable 40`       | `irrecevable` |
| vide             | `Retiré`                              | `retire`      |
| vide             | `A discuter`, ou vide                 | `en_attente`  |
| vide ou inconnu  | autre cas, par exemple `Discuté` seul | `autre`       |

Les libellés de ce tableau sont ceux observés dans `raw`. `En traitement` et `En recevabilité` sont aussi rangés dans `en_attente`, sans avoir été observés.

## Contrôles après un chargement

À lancer après chaque appel. Les trois premières colonnes doivent rendre `0`.

```sql
select
  (select count(*) from public.amendements m join public.textes x on x.id = m.texte_id
    where m.dataset_id <> x.dataset_id) as dataset_id_incoherents,
  (select count(*) from public.amendements m join public.articles a on a.id = m.article_id
    where a.texte_id <> m.texte_id) as articles_d_un_autre_texte,
  (select count(*) from public.amendements m join public.alineas al on al.id = m.alinea_id
    where al.article_id <> m.article_id) as alineas_d_un_autre_article,
  (select count(*) from public.amendements where sort = 'autre') as sorts_a_verifier,
  (select count(*) from public.amendements where article_id is null) as sans_article;
```

Sur le texte pilote : `0` dans les cinq colonnes.

## Limites connues

- **L'extrait `corpus` n'est pas chargeable en l'état.** Dans un échantillon de ses lignes, `division_avant_apres`, `article_designation_courte` et `tri_amendement` sont vides : ces amendements ne peuvent être ni rattachés à un article ni ordonnés. Seul un texte extrait en entier, comme le pilote, se charge correctement.
- **Commission et séance sont mêlées.** Le texte pilote porte 96 amendements de commission (`CF1`…) et 121 de séance sous le même uid de texte. La table `amendements` n'a pas de colonne `organe_examen` : les deux étapes ne se distinguent que par le préfixe de `numero_long` et par le `rang` (séance de 1 à 121, commission ensuite). `textes.organe_examen` reste donc vide.
- **Sous-amendements non éprouvés.** Le pilote n'en contient aucun. La liaison suppose que `amendement_parent` contient l'uid du parent ; si ce n'est pas le cas, `amendement_parent_id` reste vide et le résumé le montre (`sous_amendements` supérieur aux parents liés).
- **« Après l'alinéa » est perdu.** Un amendement qui insère après l'alinéa 10 est rattaché à l'alinéa 10, comme celui qui le modifie : `alinea_avant_apres` n'a pas de colonne.
- **Pas de suppression.** Un amendement disparu de `raw` entre deux chargements reste dans `public`. Pour repartir de zéro, supprimer le jeu (`delete from public.datasets where slug = ...`, qui emporte tout en cascade) après validation humaine, puis recharger.
