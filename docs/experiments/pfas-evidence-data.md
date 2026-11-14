# Croisements PFAS : données vérifiées

Import Hémicycle du 14 novembre 2026, réalisé localement avec la clé autorisée. Les réponses conservées ne contiennent pas de clé, de compte ou de solde de crédits. Le site sert un instantané public ; aucune clé Hémicycle n’est déployée.

## Reproduire le contrôle sans réseau

```sh
python3 scripts/verify-pfas-evidence.py
```

Ce contrôle recalcule les empreintes des trois réponses archivées, vérifie la pagination complète, les liens exacts avec le corpus Sénat, les numéros et sorts, les clés de texte et dossier, le parent du sous-amendement et les compteurs affichés. Les requêtes exactes figurent dans les fichiers `*-provenance.json`.

| Jeu                 | Filtre                                 | Lignes |
| ------------------- | -------------------------------------- | ------ |
| `senat_textes`      | `numero = 620`, `session_annee = 2023` | 1      |
| `senat_amendements` | `texte_id = 106132`                    | 32     |
| `senat_dossiers`    | `signet = ppl23-514`                   | 1      |

Les archives et l’audit sont dans `data/pfas/evidence/`. Les archives JSON sont conservées octet pour octet après exclusion des champs de compte ; elles sont exclues du reformatage Prettier pour préserver les empreintes.

## Résultats et limites

- 31 URL d’amendements concordent strictement avec `amendments.json`, sans rapprochement flou. Les 31 numéros et sorts concordent également.
- Le n° 19 reste non rapproché par URL : le CSV n’en donne pas. L’API fournit une URL et distingue un `sort` nul d’une `irrecevabilite`. Ce cas n’est pas corrigé silencieusement.
- Les 32 amendements désignent le texte `106132`. Celui-ci désigne le dossier `ppl23-514`.
- Le `parent_id` du n° 32 désigne l’enregistrement du n° 14, cohérent avec la preuve officielle déjà conservée.
- Le dossier référence le texte de commission 620, le texte adopté 140 et la loi 2025-188 du 27 février 2025. La page Légifrance affichée est la version initiale, pas le droit consolidé actuel.

Hémicycle redistribue des données du Sénat : la cohérence de deux formats ne constitue pas une corroboration indépendante. Les liens du dossier ne démontrent pas l’effet causal d’un amendement sur un passage de loi. Les nos 26 et 27 sont retirés. Les commentaires d’auteur dans les objets d’amendements sont des arguments parlementaires, pas des résultats scientifiques validés.

Le contexte sur les ustensiles de cuisine provient de la présentation officielle du Sénat : il situe leur retrait à l’Assemblée nationale. Les amendements de l’Assemblée concernés ne sont pas inclus dans ce corpus ; aucune causalité n’est attribuée aux nos 26/27 du Sénat.

## Sources et réutilisation

- [Portail et licence Sénat](https://data.senat.fr/licence/), producteur d’origine des trois jeux.
- [Modèle de données Hémicycle](https://hemicycle.ai/docs/donnees) et provenance attachée aux réponses.
- [Dossier officiel PFAS](https://www.senat.fr/dossier-legislatif/ppl23-514.html).
- [Loi 2025-188, version initiale](https://www.legifrance.gouv.fr/jorf/id/JORFTEXT000051260902).

Chaque source du contexte porte sa date de consultation, son producteur et la référence de licence disponible. L’URL du point d’accès Hémicycle nécessite un POST authentifié ; elle n’est pas une page de lecture pour le citoyen. Les pièces officielles restent directement consultables dans le parcours.
