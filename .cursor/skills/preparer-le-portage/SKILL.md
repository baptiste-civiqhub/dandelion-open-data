---
name: preparer-le-portage
description: Auditer un module, une feature ou un algorithme du hackathon et le rendre transposable tel quel dans l'application de référence (même stack). À utiliser avant de déclarer une feature terminée, avant une démo, ou quand on demande si un module est « portable », « réutilisable » ou « prêt à migrer ».
---

# Préparer le portage

Référence : `docs/portabilite.md`. Objectif : au portage, seuls les `apis/*/request.ts` sont réécrits ; tout le reste (types, queries, mutations, features, lib) est copié tel quel.

## Audit (lecture seule d'abord)

Pour le périmètre demandé (`features/<domaine>/`, `lib/<x>`, `apis/<ressource>/`), lancer et rapporter :

1. Fuites Supabase hors frontière :
   `git grep -n "@supabase\|services/supabase\|types/supabase" -- apis features lib components hooks store`
   → seules les lignes dans `apis/*/request.ts` sont acceptables.
2. Couleurs littérales :
   `git grep -nE "#[0-9a-fA-F]{3,8}\b|(bg|text|border|fill|stroke)-(red|blue|green|gray|slate|zinc|neutral|amber|emerald|sky|indigo|violet|rose)-[0-9]{2,3}" -- features components`
3. Textes en dur dans le JSX (chaînes entre balises, `placeholder="..."`, `aria-label="..."` littéraux).
4. Clés de requête ad hoc : `queryKey: ['...']` au lieu de `QueryKeysEnum`.
5. Logique de calcul dans un composant ou un hook alors qu'elle pourrait être pure → candidate pour `features/<domaine>/lib/` + test.
6. Dépendances ajoutées depuis le début du hackathon : `git diff <commit-initial> -- package.json` ; chacune doit figurer au catalogue de `docs/stack.md` ou être signalée.
7. `pnpm check` vert.

## Correction

Corriger dans l'ordre : fuites Supabase (mapper vers les types de domaine dans `request.ts`) → logique extraite en pur + tests → tokens → i18n → clés de requête. Un commit par type de correction (`refactor(<domaine>): ...`).

## Sortie

Un court rapport : périmètre, fichiers « portables tels quels », fichiers « à réécrire au portage » (normalement les seuls `request.ts`), dépendances à ajouter côté référence (avec version exacte), clés i18n à fusionner.
