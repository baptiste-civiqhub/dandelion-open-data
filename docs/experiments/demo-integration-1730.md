# Branche de secours — 14 novembre 2026

Branche `codex/demo-integration-1730`, créée dans un worktree distinct pendant que Yanis prépare la fusion de l'équipe. Aucun changement de main/develop, aucune migration Supabase exécutée.

## Contributions réunies

- Notre interface et assistant : `codex/atlas-api-integration` 657ad5c, avec les précédents parcours PFAS, Cosmograph et fleur.
- Pipeline et backend de l'équipe : develop 8396998, qui contient feat/pipeline-extraction 2f7a66d.
- Monde 3D et commandes : feat/world-3d 84ecdbe, jardin du Luxembourg, voiture/cheval et entrée dans une zone.
- Travaux locaux reportés explicitement : dépôts observés par article et présentation de la revue préparée avec Suzan AI.
- Recherche Claude conservée séparément : [rapport et résultats](https://github.com/baptiste-civiqhub/dandelion-open-data/tree/claude/ml-feasibility-20261114/research/ml-feasibility), commit 8d6f3c2.

## Parcours à montrer

1. `/` : monde 3D. Flèches/ZQSD pour conduire, V pour changer de véhicule, Entrée près d'une zone pour ouvrir sa page. Le catalogue des corpus archivés sert de repli lorsque WebGL est indisponible.
2. `/area` puis `/area/{slug}` : catalogue et fleur branchés sur le contrat Supabase. Les résumés R5 sont paginés ; les détails R7 sont chargés à l'ouverture/comparaison.
3. `/datasets/pfas-senat-620` : parcours autonome sur 32 amendements réels archivés. Saisir « Compare les amendements 26 et 27 », lire les différences, constater leurs deux retraits et ouvrir les sources. Ils ne sont pas deux versions successives d'un article.
4. `/about` : formulation exacte de la préparation de revue Suzan AI ; aucune certification obtenue n'est annoncée.

Le français est la langue initiale. Le sélecteur de langue de l'équipe est conservé. Les clés de l'assistant et de Supabase ne sont pas versionnées.

## Limites à conserver

- La clé publique Supabase n'était pas disponible dans le nouveau worktree au lancement des tests : vérifier la base réelle dans l'environnement de l'équipe. Les tests API interceptent des fixtures explicitement synthétiques, qui ne font pas partie de la démo.
- Le guide des nouveaux corpus est déterministe. Le fournisseur Featherless reste optionnel, côté serveur, et limité aux corpus enregistrés ; son raccordement au monde 3D n'est pas implémenté.
- Les dépôts observés montrent quantités, dates et sources. Aucun pourcentage de prévision. En l'absence de date et de périmètre d'examen vérifiés, ils ne sont pas présentés comme des dépôts « avant examen ».
- Les nouveaux scripts d'extraction/tagging sont intégrés mais n'ont pas été exécutés contre les services distants lors de cette fusion. `FEATHERLESS_MODEL` doit être choisi explicitement pour le script de classification, dont le modèle diffère de celui de l'assistant.

## Vérification

`pnpm check`, `pnpm format:check`, `pnpm build`, puis tests navigateur sur Chrome isolé. Le test de connexion monde → zone utilise le crochet `world:teleport` fourni par l'équipe pour positionner le véhicule ; l'entrée, le routage et la comparaison passent par les composants réels. Il ne mesure pas les performances de navigation manuelle.

Les résultats définitifs et la preview sont à lire dans la description de la branche/PR de secours remise par Codex.

En production locale, lancer `pnpm start --hostname localhost --port 3103` et tester `http://localhost:3103`. Une écoute sur 127.0.0.1 provoque ici une boucle de réécriture Next.js/next-intl vers localhost, reproduite indépendamment du sélecteur de langue.

## Actualisation avec develop a6a4867

Le Sunburst détaillé de Yanis et le déplacement du sélecteur de langue à droite de la recherche sont intégrés. Le menu conserve « Données » en français. Une zone conserve la vue guidée par défaut ; « Pissenlit détaillé » ouvre `?vue=pissenlit`, et « Comparer avec le guide » revient à la vue d’enquête. Les deux vues utilisent les mêmes résumés et sources, avec des requêtes de détail distinctes pour conserver leurs contrats.

La nouvelle vue respecte les alinéas, filtres de sort, sélection, profondeur et état dans l’URL. Les archives PFAS/municipal et Cosmograph restent accessibles. Aucune migration exécutée. La clé publique Supabase manque toujours localement ; les tests API interceptent des fixtures synthétiques, qui ne figurent pas dans la vidéo ni dans le corpus produit.

Validation après actualisation : 367 tests unitaires ; 38 parcours navigateur sur build de production et 9 scénarios API distincts réussis (fixtures interceptées). Lint, typage, tokens, format et build réussis. Les libellés de navigation ont nécessité le redémarrage du serveur de développement pour recharger les catalogues de traduction. Aucun test sur la base réelle faute de clé publique.
