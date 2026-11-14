# DATA_CARD : réécriture ou suppression d'une disposition à la prochaine étape parlementaire

Rédigée le 14 novembre 2026. Jeu de recherche exploratoire. Aucune donnée n'est versionnée dans le dépôt : les scripts la reconstruisent depuis la source publique.

## Unité, cible, horizon

| Élément | Définition |
|---|---|
| Observation | `(dossier, article, étape k, date de coupure)`. Un article existe à l'étape k (statut `depot`, `new` ou `none`, pas `sup`) |
| Date de coupure | `enddate` de l'étape k dans `procedure.json` : la version k du texte est publiée |
| Horizon | la prochaine version officielle observée du texte (étape k+1 du dossier qui porte des articles) |
| Classes | `inchange` (statut `none`, `n_diff = 0`), `modifie` (statut `none`, `n_diff > 0`), `supprime` (statut `sup`) |
| Inconnus, jamais des négatifs | `non_apparie` (article absent de la version k+1), `derniere_etape` (pas de version suivante dans les données), `autre_*` (statuts `REJET`, `ÉCHEC`, `new`) |
| Hors cible | transitions vers le Conseil constitutionnel : ce n'est pas une étape parlementaire, comptées à part |
| Signal d'audit | `suspect_renum_ou_fusion` : suppression accompagnée, à la même étape, d'un article créé de longueur à 5 % près. Renumérotation, scission ou fusion possible. Non corrigé, compté |

Renumérotation : pendant la navette, La Fabrique suit un article par son identifiant (`11_bis_A`) ; les articles insérés reçoivent un suffixe et ne renumérotent pas les autres. La renumérotation finale a lieu à la promulgation, étape absente de `articles_etapes.json`. Une scission ou une fusion apparaît comme `sup` plus `new` : c'est ce que le signal d'audit repère, sans pouvoir trancher.

## Variables disponibles à la coupure

| Groupe | Variables | Disponibilité à la date de coupure |
|---|---|---|
| Base | `etape_k`, `institution_k`, `lecture_k`, `statut_k`, `modifie_a_k`, `ndiff_k`, `log_longueur_k`, `nb_etapes_article`, `position_relative` (rang parmi les articles présents à k), `log_nb_articles_k`, `type_texte`, `procedure_acceleree` | publiées avec la version k |
| Base, étape suivante | `etape_suivante`, `institution_suivante`, `lecture_suivante` | connues par la procédure et l'agenda dans la plupart des cas ; le choix entre CMP et nouvelle lecture peut rester ouvert à la coupure |
| Graphe simple | `nb_modifs_passees`, `nb_suppressions_passees`, `article_insere`, `part_modifies_k`, `part_crees_k` | historique des versions 0 à k |
| Réglage B, veille de l'examen | `nb_amdt_deposes`, `nb_amdt_gouvernement`, `nb_groupes_amdt` sur l'article lui-même | amendements dont la date de dépôt précède le début de l'examen de l'étape k+1. Le sort n'est jamais lu |

Exclues des entrées (test `test_forbidden_columns_cannot_be_features`) : label, `ndiff_suivant`, signal d'audit, identifiants de dossier et d'article, dates.

Fuite corrigée pendant l'étude : le champ `order` de La Fabrique est calculé sur tout l'historique, articles futurs compris. Il ne sert plus qu'à trier les articles présents à k (test `test_article_created_later_does_not_move_position_at_cutoff`).

Fuite non corrigée, signalée : `articles_etapes.json` est un état reconstruit après coup par le parseur. Les statuts et `n_diff` des versions passées sont stables par construction, mais la date de collecte n'est pas la date de publication : rien n'atteste que chaque champ était disponible tel quel à la date de coupure.

## Sources et licences

| Source | Contenu utilisé | Licence | Couverture vérifiée le 14 novembre 2026 |
|---|---|---|---|
| La Fabrique de la Loi, https://www.lafabriquedelaloi.fr/api/ | `dossiers.csv`, `stats/metrics.csv`, `viz/procedure.json`, `viz/articles_etapes.json`, `viz/amendements_<étape>.json`, `procedure/<étape>/texte/texte.json` (exemples) | ODbL (« librement réutilisables en Open Data sous licence ODBL », HEADER.html) | 1 530 dossiers, 1 042 promulgués ; date initiale du 2008-01 au 2022-01-11 ; dernière promulgation le 2021-04-22 |
| Générateur the-law-factory-parser | non exécuté | GPL-3.0 | à évaluer pour prolonger la couverture après 2021 |
| Assemblée nationale, Sénat (URL `source_url` de chaque étape) | textes officiels cités dans `examples/` | open data des assemblées | lien par étape dans `procedure.json` |

Les données dérivées (observations) relèvent de l'ODbL si elles sont publiées : attribution à La Fabrique de la Loi et partage à l'identique.

## Échantillon

48 dossiers promulgués tirés par `select_sample.py` (graine 20261114), textes d'au moins 5 articles initiaux :

| Split | Règle | Éligibles | Tirés |
|---|---|---|---|
| train | date initiale à partir de 2008, promulgation au plus tard le 2015-12-31 | 229 | 25 |
| valid | date initiale à partir du 2016-01-01, promulgation au plus tard le 2017-12-31 | 32 | 8 |
| test | date initiale à partir du 2018-01-01 | 64 | 15 |

Taille limitée par le débit du serveur : environ 12 secondes par requête le 14 novembre 2026, y compris pour la page d'accueil. Les amendements ne sont collectés que pour le test.

Effectifs construits le 14 novembre 2026 (`coverage.json`, `RESULTS.json`) :

| Split | Dossiers | `inchange` | `modifie` | `supprime` | `non_apparie` | `derniere_etape` | hors cible (Conseil constitutionnel) | `autre_*` |
|---|---|---|---|---|---|---|---|---|
| train | 25 | 2 722 | 2 175 | 137 | 475 | 913 | 503 | 4 |
| valid | 8 | 697 | 622 | 83 | 837 | 499 | 304 | 4 |
| test | 15 | 2 185 | 1 731 | 211 | 1 155 | 841 | 523 | 5 |

Observations étiquetées : 5 034 (train), 1 402 (valid), 4 127 (test). Sur les 16 626 observations construites, 6 063 (36 %) sont inconnues ou hors cible et ne servent ni à l'entraînement ni à l'évaluation.

Fréquence de `supprime` : 2,7 % en train, 5,1 % en test. Suppressions signalées suspectes de renumérotation ou fusion : 128 sur 431 (30 %). Un cas audité à la main est un faux positif (voir `examples/`), ce taux surestime donc les renumérotations.

Réglage B (test seulement) : 3 417 observations de 15 dossiers ont l'information « amendements déposés » (fichier collecté, ou 0 amendement annoncé par `procedure.json`).

## Limites

- Aucune donnée des 16e et 17e législatures : ni PFAS (2024), ni PLFG 2026. Le régime de majorité relative depuis 2022 peut changer les taux de réécriture : un modèle 2008 à 2021 n'est pas transposable sans nouvelle évaluation.
- `modifie` est un changement textuel : un quart des cas a `n_diff < 0,02`, souvent une retouche de forme. Aucun label sémantique n'a été annoté.
- `non_apparie` se concentre sur les transitions vers la CMP et en nouvelle lecture. Inférence non vérifiée : articles adoptés conformes, sortis de la navette.
- Les suppressions comptent une part élevée de cas suspects de renumérotation ou fusion (voir RESULTS.json), à auditer sur les textes.
- Les amendements identiques ne sont pas regroupés en familles (La Fabrique ne fournit pas `discussion_identique`) : les comptes du réglage B peuvent surcompter.
