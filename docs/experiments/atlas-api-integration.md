# Fleur, API et navigation Atlas / Area

Branche d’intégration personnelle basée sur `codex/team-integration` (`bcb72f3`) et `feat/world-3d` / `feat/atlas-areas-navigation` (`d419fa9`). Aucun changement de `main` ou `develop`, aucune migration exécutée.

## Parcours

- `/` conserve les deux corpus archivés tant que le monde 3D ne signale pas sa première image.
- « Atlas » ouvre la carte des zones de l’API ; « Données » ouvre leur catalogue. `/area` reste accessible directement.
- `/area/{slug}` lit la zone et ses textes. Choix du texte, fleur bornée à 150 éléments visibles, navigation, zoom, recherche et guide français.
- R5 charge les résumés par pages de 1 000. R7 charge uniquement les documents ouverts ou comparés, avec les filtres `texte_id` **et** `id` ; cache TanStack de cinq minutes.
- « Compare CF1 et CF2 » pilote la sélection si ces numéros existent dans le texte. Sélection manuelle également possible depuis les fiches. Changer de texte vide la sélection.
- `/datasets/pfas-senat-620`, `/datasets/police-municipale-an-2464`, `/experiments/pfas` et `/experiments/pfas/cosmograph` restent disponibles. Le lien vers ces corpus est présent dans le catalogue des zones.

## Données et limites

Les branches du nouveau corpus correspondent aux articles / amendements / parents déclarés, sans classification lexicale de textes non chargés. Les couleurs représentent les sorts renvoyés par l’API. Le regroupement détaillé par alinéa n’est pas implémenté dans ce raccordement.

Les rangs peuvent mêler commission et séance ; la vue n’affirme pas une chronologie. La différence de texte ne démontre ni filiation, ni impact juridique, sanitaire ou économique. Aucun lien officiel absent n’est inventé. Le HTML des documents est converti en texte puis rendu par React, jamais injecté dans le DOM.

Les zones dont le slug commence par `demo-` sont marquées comme zones de démonstration. Les zones vides n’affichent aucun amendement fabriqué. Le guide du nouveau corpus est déterministe ; le fournisseur Featherless existant reste limité aux corpus déjà pris en charge, avec sa clé uniquement côté serveur.

## Configuration et vérification

Le projet Supabase reste `mloaychfjhajdjfktcjp`. Seule `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` est nécessaire dans `.env.local` (ignoré par Git). Aucune clé serveur ni migration n’est requise. Sans clé, les corpus archivés restent consultables et les zones signalent une erreur explicite.

Contrôles : `pnpm check`, `pnpm format:check`, `pnpm build` et `pnpm test:smoke`. Les tests `live-area.spec.mjs` s’exécutent séparément avec `API_FIXTURE_TESTS=1`, un serveur configuré avec une clé de test non fonctionnelle et des réponses Supabase interceptées. Ils vérifient le contrat et l’interface ; ils ne prouvent pas le contenu de la base réelle. Leurs documents synthétiques ne sont jamais ajoutés au corpus applicatif.

Le jeu de Valentin n’est pas présent dans `d419fa9` : `createWorldScene` prépare seulement le contexte WebGL2 et son viewport. Les callbacks de navigation de l’équipe sont conservés pour son intégration future.
