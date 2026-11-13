---
name: ecrire-un-test
description: Écrire un test vitest co-localisé (*.test.ts) pour de la logique pure (lib/, features/*/lib/, sélecteurs, mappings, payloads) ou un smoke Playwright (test/e2e/*.spec.mjs). À utiliser dès qu'on ajoute ou modifie un algorithme, un calcul, un sélecteur de présentation ou une route critique.
---

# Écrire un test

## Vitest (unitaire)

- Fichier `<module>.test.ts` **à côté** du module testé. Seul le motif `**/*.test.ts` est collecté (pas de `.test.tsx`).
- Environnement `node`, `globals: false` : importer `describe`, `it`, `expect` depuis `vitest`. Alias `@/` disponible.
- Aucun réseau, aucune variable d'environnement, aucun client Supabase : on teste la logique pure. Si une fonction a besoin de données, elle les reçoit en paramètre.
- Fixtures : petit builder `makeXxx(overrides: Partial<Xxx> = {})` qui remplit les champs obligatoires et n'expose que ceux lus par la fonction.
- Structure : `describe('<fonction>') > it('<comportement attendu, en anglais>')`. Couvrir : cas nominal, vide, bornes, données incohérentes de l'open data (null, doublons, valeurs hors plage).
- Exemples dans le repo : `lib/utils.test.ts`, `app/api/health/payload.test.ts`, `features/home/lib/supabase-status-presentation.test.ts`.

Commandes : `pnpm test` (une passe), `pnpm test:watch`, `pnpm test <chemin>` ou `pnpm test -t "<nom>"`.

## Playwright (smoke)

- `test/e2e/*.spec.mjs`, config `playwright.config.mjs` (viewport 1440 × 1024, démarre `pnpm dev`).
- Sur un poste Windows : `PLAYWRIGHT_CHANNEL=msedge pnpm test:smoke` (aucun navigateur à télécharger).
- Un smoke vérifie qu'une route se rend sans erreur console et que son contenu principal est visible ; pas de test pixel.

## Règles

- Lancer `pnpm test` avant et après la modification : seule une spec qui passait avant et échoue après est une régression.
- Ne jamais supprimer, `skip` ou vider un test pour faire passer la suite.
