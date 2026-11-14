# Faisabilité scientifique des prédictions Dandelion

14 novembre 2026. Étude exploratoire réalisée dans un checkout indépendant (branche `claude/ml-feasibility-20261114`). Aucune modification du frontend, de Supabase ni d'une donnée distante. Aucun crédit Hémicycle ni Featherless consommé.

## Recommandation (une page)

**Cible retenue :** « Parmi les dispositions que je suis, lesquelles risquent d'être réécrites ou supprimées à la prochaine étape parlementaire ? ». Unité : article et étape, labels `inchange`, `modifie`, `supprime`, à la prochaine version officielle observée.

**Décision : poursuivre sous conditions, sans afficher de probabilité aujourd'hui.**

1. **Le signal existe, sur l'historique 2008 à 2021.** Les 15 dossiers de test datent de 2018 à 2021, soit 4 127 observations. À la publication de la version k, la régression logistique classe les articles qui vont changer avec une PR-AUC de 0,82 (IC 95 % par dossiers 0,74 à 0,87). La référence « aucun changement » est à 0,47, la règle par type d'étape à 0,68 (0,61 à 0,74). Parmi les 5 premières alertes de chaque texte et de chaque étape, 69 % sont justes, contre 57 % pour la règle et 48 % au hasard.
2. **TabICL n'apporte pas de gain démontré.** TabICL v2 (checkpoint `tabicl-classifier-v2-20260212.ckpt`, CPU) obtient une PR-AUC de 0,833 (0,77 à 0,87), un macro-F1 de 0,499 et un Brier de 0,377. La régression logistique obtient 0,820, 0,486 et 0,392. Les intervalles se recouvrent : l'écart n'est pas établi.
3. **Les variables de graphe n'apportent rien et aucun GNN n'est justifié.** Historique de réécriture et activité du dossier à k : macro-F1 de 0,483 à 0,486 pour la régression logistique, de 0,480 à 0,482 pour le gradient boosting. Avec 25 dossiers d'entraînement, un GNN n'a ni la donnée ni un gain relationnel mesuré à exploiter. Arrêt de cette piste.
4. **La suppression n'est pas prévisible.** Aucun modèle ne prédit jamais `supprime` : la colonne correspondante de la matrice de confusion est vide pour TabICL. La PR-AUC est de 0,12 pour une fréquence de 0,05. Les labels de suppression sont en outre fragiles : 30 % sont signalés comme renumérotation ou fusion possible, un cas audité est un faux positif, et une suppression peut être rétablie en CMP (exemple réel dans `examples/`).
5. **Une fois les amendements déposés, une règle déterministe suffit presque.** À la veille de l'examen (réglage B, 3 417 observations de test), l'alerte « au moins un amendement déposé sur l'article » a une précision de 0,78 et un rappel de 0,75. C'est sourcé, explicable, sans modèle. Ajouter l'historique pour départager fait passer la précision parmi les 5 premières alertes de 0,65 à 0,70.
6. **Blocage principal : aucune donnée pour la période du produit.** La Fabrique de la Loi s'arrête aux dossiers déposés avant janvier 2022 (dernière promulgation le 22 avril 2021). Rien sur les 16e et 17e législatures, donc rien sur PFAS (2024) ni sur PLFG 2026. Le corpus du prototype ne contient qu'une étape par texte, sans versions successives : il ne permet ni entraînement ni évaluation.

**Pour le prototype de ce soir :** une alerte déterministe et sourcée, au contrat `observed_change`. Par exemple : « article X : 12 amendements déposés avant l'examen du 3 décembre, dont 2 du Gouvernement ; version actuelle ; source ». Pas de champ `forecast` affiché. Le chiffre de 69 % est un résultat historique 2018 à 2021, pas une performance du produit.

**Pour poursuivre après le hackathon,** dans l'ordre :
1. reconstruire les versions article par article de 2022 à 2026, en relançant `the-law-factory-parser` (GPL-3.0) ou à partir des textes Akoma Ntoso du Sénat ;
2. faire auditer par deux annotateurs un échantillon de labels (renumérotation, fusion, changement de fond), en conservant les désaccords ;
3. réévaluer sur la 17e législature, avec le même protocole et un test intact ;
4. n'afficher une probabilité que si elle bat la règle « amendements déposés » sur cette période.

## 1. Question produit et choix de la cible

| Cible | Labels accessibles | Ce que la prédiction ajoute à ce qui est publié | Verdict |
|---|---|---|---|
| Réécriture ou suppression à la prochaine étape | Oui, 2008 à 2021 : `articles_etapes.json` de La Fabrique donne statut et `n_diff` par article et par étape | Avant le dépôt des amendements, l'historique est la seule information : la prévision trie les articles à suivre des semaines avant l'examen. Après le dépôt, la règle « amendements déposés » fait l'essentiel | **Retenue** |
| Délai jusqu'à la prochaine étape officielle | Oui : dates des étapes dans `procedure.json` (censure pour les textes non aboutis) | Faible à court terme : l'agenda publié (conférence des présidents, ordre du jour) annonce déjà les prochaines semaines. Utile à long terme seulement | Non retenue pour ce prototype |
| Délai de publication d'une mesure d'application | NOT FOUND dans les sources collectées : La Fabrique ne couvre pas les décrets d'application. Les échéanciers de Légifrance n'ont pas été examinés | Fort pour une association (suivi de la mise en œuvre), mais le rattachement disposition et décret reste à construire | Non retenue faute de labels vérifiés |

Une alerte sur un changement déjà publié est une détection, pas une prédiction. La cible retenue est une prédiction tant que la coupure précède la publication de la version k+1.

## 2. Données vérifiées

| Source | Fait vérifié le 14 novembre 2026 | Preuve |
|---|---|---|
| Dépôt Dandelion, `develop` `3b9c3ab` | Import `plffg-2026` (texte `PRJLANR5L17B3434`) : 10 articles, 9 alinéas, 217 amendements (96 de commission et 121 de séance mêlés), `dispositif` des alinéas vide | `docs/dandelion/import.md` |
| Corpus du prototype | Un seul texte et une seule étape par jeu : aucune version successive d'article. Les amendements PFAS 26 et 27 sont deux propositions distinctes, pas deux versions | `docs/dandelion/import.md`, note de Codex |
| La Fabrique de la Loi | Licence ODbL ; 1 530 dossiers, 1 042 promulgués ; date initiale du 2008-01 au 2022-01-11 ; dernière promulgation le 2021-04-22 ; 488 dossiers non promulgués figés depuis | https://www.lafabriquedelaloi.fr/api/HEADER.html, `dossiers.csv` |
| Structure | Par article et par étape : `status` (`depot`, `new`, `none`, `sup`), `n_diff`, `length`. Amendements par étape : `date` de dépôt, `groupe`, `sort`, article visé | `viz/articles_etapes.json`, `viz/amendements_<étape>.json` |
| Débit du serveur | Environ 12 s par requête, page d'accueil comprise : collecte limitée à 48 dossiers | mesures `curl` du 14 novembre 2026 |
| Orcet (Hémicycle) | 84 % des votes individuels retrouvés (190 004 sur 226 179) sur 1 592 scrutins masqués ; « Le découpage de l'évaluation est aléatoire » ; `moyenne_probabilites_pour` n'est pas une probabilité d'adoption | https://hemicycle.ai/docs-md/modeles/orcet.md |
| TabICL | Version 2.2.0 du 2026-09-02 sur PyPI, licence BSD-3-Clause, Python 3.10 ou plus ; checkpoint par défaut `tabicl-classifier-v2-20260212.ckpt` sur le dépôt Hugging Face `jingang/TabICL` ; benchmarks annoncés entre 300 et 100 000 lignes d'entraînement | PyPI, README de https://github.com/soda-inria/tabicl, code de `tabicl/_sklearn/classifier.py` |

Le chiffre de 90 % entendu à l'événement n'a pas de protocole publié : il ne figure pas dans la documentation d'Orcet consultée. Cette étude ne construit pas de doublon « adopté ou rejeté » : la cible porte sur l'article, pas sur l'amendement.

## 3. Protocole

- **Unité :** `(dossier, article, étape k, date de coupure)`. **Horizon :** la prochaine version observée. **Inconnus** (`non_apparie`, `derniere_etape`, `autre_*`) et **hors cible** (transitions vers le Conseil constitutionnel) : exclus, jamais comptés comme négatifs. Détail dans `DATA_CARD.md`.
- **Échantillon :** 48 dossiers promulgués d'au moins 5 articles, tirés avec la graine 20261114. Train : 25 dossiers de 2008 à 2015. Valid : 8 dossiers de 2016 à 2017. Test : 15 dossiers à partir de 2018. Dossiers entiers dans un seul split, périodes sans chevauchement.
- **Réglage A (coupure à la publication de la version k) :** variables de l'étape k et de son passé seulement. Variables de graphe : historique de réécriture de l'article, activité du dossier à k. Les références internes n'ont pas été calculées : il faudrait le texte de chaque étape.
- **Réglage B (coupure à la veille de l'examen de l'étape k+1) :** amendements déposés sur l'article avant le début de l'examen. Le sort n'est jamais lu. Évalué sur le test seulement, avec des règles sans entraînement.
- **Modèles :**
  - référence « aucun changement » (fréquences d'entraînement) ;
  - règle publiée (fréquences par type d'étape suivante et modification à k) ;
  - régression logistique ;
  - gradient boosting (`HistGradientBoostingClassifier`, réglages par défaut, 200 itérations, sans recherche d'hyperparamètres) ;
  - TabICL v2 sur CPU, avec un contexte de 3 000 lignes tirées dans le train (limite mémoire du poste) et 8 estimateurs.
- **Seuils et évaluation :** le seuil d'alerte est choisi sur la validation, le test n'est lu qu'une fois. Intervalles à 95 % par 1 000 rééchantillonnages des dossiers du test.
- **Fuites contrôlées par tests :**
  - perturber les versions futures ne change aucune entrée ;
  - un article créé plus tard ne déplace pas la position d'un article à k ;
  - le sort des amendements ne change pas les entrées ;
  - les colonnes d'audit et les identifiants sont refusés comme entrées.
- **Fuite corrigée en cours d'étude :** le champ `order` de La Fabrique est calculé sur tout l'historique.
- **Limite non corrigée :** les fichiers sont un état reconstruit après coup, la date de collecte n'est pas la date de publication.

## 4. Résultats exécutés (test 2018 à 2021, 15 dossiers, 4 127 observations)

Fréquences au test : `inchange` 52,9 %, `modifie` 41,9 %, `supprime` 5,1 %.

| Modèle | macro-F1 | PR-AUC changement | PR-AUC suppression | Brier | Précision aux 5 premières alertes | Rappel aux 5 premières |
|---|---|---|---|---|---|---|
| Aucun changement | 0,231 | 0,471 | 0,051 | 0,542 | 0,478 | 0,250 |
| Règle publiée | 0,437 | 0,679 (0,61 à 0,74) | 0,091 | 0,470 | 0,567 (0,50 à 0,64) | 0,335 |
| Régression logistique, base | 0,483 | 0,822 (0,74 à 0,87) | 0,117 | 0,392 | 0,691 (0,61 à 0,78) | 0,398 |
| Régression logistique, base et graphe | 0,486 | 0,820 | 0,115 | 0,392 | 0,691 | 0,398 |
| Gradient boosting, base et graphe | 0,482 | 0,798 | 0,100 | 0,446 | 0,669 | 0,371 |
| TabICL v2, base et graphe | 0,499 (0,48 à 0,51) | 0,833 (0,77 à 0,87) | 0,120 | 0,377 (0,34 à 0,41) | 0,691 (0,62 à 0,78) | 0,404 |

- **Calibration du risque de changement :** ECE de 0,037 pour TabICL et 0,047 pour la régression logistique, contre 0,122 pour le gradient boosting.
- **Alerte binaire au seuil choisi sur la validation :** pour TabICL, précision 0,64, rappel 0,88, 2 658 alertes sur 4 127 observations. Le seuil favorise le rappel, ce qui fait beaucoup d'alertes à lire.
- **Matrice de confusion de TabICL** (lignes vrai, colonnes prédit, ordre `inchange`, `modifie`, `supprime`) : `[[1682, 503, 0], [394, 1337, 0], [100, 111, 0]]`.

Réglage B, veille de l'examen (3 417 observations de test, 15 dossiers, 45,6 % de changements) :

| Score | PR-AUC changement | Précision aux 5 premières alertes | Rappel aux 5 premières |
|---|---|---|---|
| Règle « au moins un amendement déposé » | 0,743 | 0,651 | 0,358 |
| Historique seul (gradient boosting) | 0,793 | 0,666 | 0,393 |
| Amendements, puis historique pour départager | 0,814 | 0,703 | 0,433 |

Alerte binaire « au moins un amendement » : précision 0,779, rappel 0,754, 1 509 alertes.

- **Coût :** 112 secondes pour l'ensemble de l'évaluation, dont 64 secondes pour TabICL (ajustement 0,35 s). Pic mémoire de 2,29 Go sur un MacBook arm64 de 16 Go, sans GPU payant.
- **Incident :** une première exécution de TabICL sur MPS a échoué par manque de mémoire (« other allocations: 14.73 GiB »), probablement en lien avec le crash du poste. Il faut utiliser `--tabicl-device cpu`, désormais la valeur par défaut.

Ces résultats sont exploratoires : 15 dossiers de test, une période révolue, des labels textuels. Ils ne mesurent pas la performance sur la législature actuelle.

## 5. Qualité des labels

- **Changement lexical et changement de fond.** Un quart des `modifie` ont `n_diff < 0,02`. Exemple réel, article 35 de pjl18-677 : « usagers et notamment » devient « usagers, notamment ». C'est une modification textuelle sans effet juridique. Aucun label sémantique n'a été annoté. Un LLM ne peut pas servir de vérité terrain sans revue humaine.
- **Renumérotation, scission et fusion.** 128 suppressions sur 431 sont suspectes selon l'heuristique de longueur. Le cas audité `11_quater` est une vraie suppression, rétablie en CMP : l'heuristique surestime ces cas. Un appariement sur le texte est nécessaire avant de séparer les classes.
- **`non_apparie` (2 467 cas).** Ils se concentrent sur les transitions vers la CMP et en nouvelle lecture. Inférence, non vérifiée sur les textes : il s'agit des articles adoptés conformes, sortis de la navette. Pour le produit, cela fait une règle déterministe de plus : un article adopté conforme ne bouge plus, sauf coordination.

Les exemples auditables, avec les deux URL officielles et les passages avant et après, sont dans `examples/pjl18-677_senat-seance_vers_an-commission.md`.

## 6. Conséquences d'une loi : une autre question

Une probabilité de réécriture prévoit la trajectoire d'un texte au Parlement. Elle n'estime aucun effet réel. Un modèle supervisé sur l'adoption ou la réécriture, TabICL ou GNN compris, n'identifie pas l'effet causal d'une loi : il apprend des régularités de procédure.

Pour les effets économiques, OpenFisca permet de coder une réforme explicite, puis de calculer barème de référence et barème réformé sur des cas types synthétiques. La documentation précise : « OpenFisca simulates only the mechanics of taxes and benefits » (https://openfisca.org/doc/key-concepts/reforms.html, consultée le 14 novembre 2026). Elle ne prévoit ni croissance, ni emploi, ni comportements. Cette étude n'a exécuté aucune simulation : statut `not_run` dans `RESULTS.json`. Une simulation de retraite exigerait de vérifier d'abord la couverture du modèle France. Les effets sanitaires des PFAS demanderaient des données d'exposition et une identification causale : aucun score du graphe actuel n'y répond.

## 7. Sources datées

Toutes consultées le 14 novembre 2026 :
- La Fabrique de la Loi : https://www.lafabriquedelaloi.fr/api/HEADER.html, `dossiers.csv`, `stats/metrics.csv`, et les fichiers par dossier (ODbL) ;
- documentation d'Orcet : https://hemicycle.ai/docs-md/modeles/orcet.md ;
- TabICL : https://pypi.org/project/tabicl/ et https://github.com/soda-inria/tabicl ;
- OpenFisca : https://openfisca.org/doc/key-concepts/reforms.html ;
- graphes hétérogènes PyG, cités pour mémoire et non utilisés : https://pytorch-geometric.readthedocs.io/en/latest/tutorial/heterogeneous.html ;
- dépôt Dandelion `develop` `3b9c3ab`.

Le Sénat (DOSLEG, AMELI, Akoma Ntoso) et `the-law-factory-parser` n'ont pas été exploités. Ce sont les deux voies pour couvrir 2022 à 2026.
