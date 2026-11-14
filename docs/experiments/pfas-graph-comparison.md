# Deux moteurs, un même parcours PFAS

Les deux prototypes utilisent la stack de l’équipe : Next.js 15, React 19, TypeScript, TanStack Query, next-intl et le design system du dépôt. Le choix porte sur le moteur de visualisation, pas sur le remplacement de cette stack.

|                              | Vue par article                              | Vue par forces                                                                                 |
| ---------------------------- | -------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| Route                        | `/experiments/pfas`                          | `/experiments/pfas/cosmograph`                                                                 |
| Moteur réel                  | React / SVG                                  | `@cosmograph/cosmograph` **2.5.1**                                                             |
| Disposition                  | Radiale, déterministe, regroupée par article | Simulation de forces GPU, graine fixe                                                          |
| Navigation                   | Clic, clavier, zoom, déplacement, filtre     | Clic sur points et libellés, zoom, déplacement, filtre, pause/reprise                          |
| Données                      | 41 nœuds, 40 liens, 32 amendements           | Identiques                                                                                     |
| Résultat utile               | Comparaison 26/27 sourcée et export Markdown | Identique                                                                                      |
| Dépendance ajoutée           | Aucune                                       | Cosmograph et ses dépendances transitives, dont DuckDB-Wasm                                    |
| Chargement externe du moteur | Aucun                                        | Worker et WebAssembly DuckDB depuis jsDelivr                                                   |
| Licence du moteur ajouté     | Sans objet                                   | CC-BY-NC-4.0, attribution conservée ; licence commerciale distincte pour un produit commercial |
| Clavier dans le graphe       | Oui                                          | Non ; liste accessible commune disponible sous le graphe                                       |

## Choix proposé pour ce MVP

Pour **32 amendements**, conserver la vue par article comme entrée principale : elle donne une structure stable, tous les numéros sont visibles sur ordinateur, le portage reprend directement les conventions de l’équipe et aucun moteur externe n’est à charger.

Cosmograph fournit rapidement une vraie simulation et des interactions spécialisées. La seconde route permet à l’équipe de les essayer sur les mêmes données. Son intérêt pour un réseau beaucoup plus grand reste à mesurer sur un corpus représentatif ; ce test de 41 nœuds ne constitue pas un benchmark de passage à l’échelle.

Cosmograph masque certains libellés en collision, même lorsque les points sont présents. Filtrer un article, mettre la simulation en pause et recentrer facilitent la lecture ; la liste commune reste le moyen déterministe de retrouver un numéro précis. Les tests cliquent réellement le libellé 32 et le point 14 pour alimenter une comparaison, puis vérifient également la paire 26/27 depuis la liste.

Le package Python publié `civiqhub-selene` 0.0.1 est une ébauche. Aucun des deux rendus ne prétend exécuter un algorithme Séléné. Le contrat pur `AmendmentGraph` facilite une future connexion à ce moteur lorsqu’il sera exploitable.

## Ce qui est mesuré

`scripts/benchmark-pfas-graphs.mjs` utilise trois contextes Chrome neufs par route, un build de production local, un viewport 1440×1024 et aucun ralentissement artificiel. Il mesure le délai depuis la navigation jusqu’à l’état prêt du moteur plus deux trames, le changement de filtre, les ressources HTTP et le débordement horizontal. Le navigateur, le processeur et le moteur WebGL sont consignés.

Ce protocole compare le coût pratique des deux intégrations. Il ne mesure ni le temps gagné par un journaliste, ni la consommation énergétique, ni la capacité à traiter des centaines de milliers de nœuds. Le protocole utilisateur séparé reste dans `pfas-evaluation.md`.

Mesure locale du 14 novembre 2026 à 10:25 UTC : Apple M2 Pro, Chrome 157.0.8103.51, WebGL ANGLE Metal. Trois essais par vue, sans compilation ni tests en parallèle. Médianes ci-dessous ; les délais incluent l’observation par Playwright et ne sont pas des durées pures de calcul. Le signal « prêt » du moteur ne correspond pas à la fin de la convergence de la simulation.

| Mesure observée                                   |  Vue par article |             Cosmograph |
| ------------------------------------------------- | ---------------: | ---------------------: |
| Disponibilité depuis la navigation                | 136 ms (134–184) | 1 482 ms (1 476–1 483) |
| Filtre Article 1er                                |             9 ms |                 378 ms |
| Réponses HTTP reçues, corps compressés + en-têtes |          0,43 Mo |                7,99 Mo |
| Ressources sur un domaine externe                 |                0 |                      2 |

Les octets couvrent la page complète et un changement de filtre, y compris les ressources des workers. Les données de mesure brutes sont remises dans `output/graphes-pfas-2026-11-14/comparison/measurements.json` du dossier de travail. Une connexion mobile ou une machine différente changera ces chiffres. Le résultat justifie la préférence pour le rendu natif sur ce corpus ; il ne préjuge pas d’un grand réseau.

## Réseau, licence et portage

Cosmograph 2.5.1 charge deux ressources DuckDB 1.32.0 depuis jsDelivr : `duckdb-browser-eh.worker.js` et `duckdb-eh.wasm`. Les textes sont déjà dans l’instantané local et traités dans le navigateur. La note exportée n’est pas envoyée à un service.

Le gestionnaire de télémétrie fourni par cette version est désactivé sur localhost. Hors localhost, sans licence commerciale active, il peut envoyer à son propre service des **métriques techniques** : user-agent, domaine, nombres de nœuds, liens et colonnes. Le code inspecté ne place ni texte d’amendement ni sélection dans ce message. Ce comportement est celui du paquet ; aucune promesse « zéro requête externe » ne doit être faite pour cette vue. La variante native ne charge pas Cosmograph, et le lien vers l’autre route désactive le préchargement automatique.

L’attribution graphique officielle est conservée, y compris son libellé fixe en anglais. Les commandes, panneaux, erreurs et exports de l’expérimentation sont en français. La licence complète est distribuée dans le paquet ; référence : [CC BY-NC 4.0](https://creativecommons.org/licenses/by-nc/4.0/), [documentation Cosmograph](https://cosmograph.app/docs-lib/) et [licences commerciales](https://cosmograph.app/pricing/).

Le build réussit avec deux avertissements webpack concernant les imports dynamiques des variantes Node de DuckDB (versions transitives 1.30.0 et 1.32.0). L’installation signale aussi un exécutable `arrow2csv` absent du paquet Arrow ; ce CLI n’est pas utilisé par le prototype. Aucune dépendance existante n’a été montée de version.

## Revue de la livraison déléguée

Devin a livré le composant et un harnais isolé. La revue locale conserve le composant, remplace le harnais par le vrai parcours commun et ajoute le clic sur les libellés, les tokens de séries du dépôt, un meilleur contraste des étiquettes, des points plus grands et le respect de la préférence de mouvement réduit au démarrage. Cosmograph calcule sa propre disposition initiale par forces ; il ne reçoit pas les coordonnées fixes du SVG. Le filtre met à jour l’instance Cosmograph ; il ne recharge pas le moteur à chaque article. Les changements de cadrage sont immédiats. La reprise relance les forces avec une intensité réduite, y compris si le moteur avait déjà terminé et remis sa progression à zéro. Après reconstruction et interaction, les contrôles se synchronisent sur l’état réel du moteur, même si celui-ci ne réémet pas son callback de démarrage. Les tests locaux vérifient également que la comparaison reste utilisable sans WebGL.

La position d’un nœud est un choix de présentation. Aucun lien de similarité politique, score d’impact environnemental, résultat de GNN ou effet causal n’est déduit de ce graphe.
