---
name: brancher-une-table-supabase
description: Créer ou exposer une table Supabase (migration, RLS, types générés) et la consommer côté front via la couche apis/<ressource>/ (types, request, queries, mutation) + QueryKeysEnum, de façon portable. À utiliser dès qu'une feature lit ou écrit des données Supabase, qu'on importe un jeu de données open data, ou qu'on ajoute une table, une vue ou une policy.
---

# Brancher une table Supabase

Projet `mloaychfjhajdjfktcjp` (eu-central-1). Outils du MCP `supabase`. Lire d'abord `docs/portabilite.md` (règle 1 : Supabase ne sort jamais de `request.ts`).

## 1. Schéma (si la table n'existe pas)

1. `list_tables` (schéma `public`) : vérifier l'existant, ne jamais dupliquer une table.
2. `apply_migration` avec un nom snake_case explicite (`create_deputies`, `add_group_id_to_votes`). Dans la même migration :
   - la table (clé primaire, `created_at timestamptz default now()`, colonnes snake_case, contraintes `not null` et FK réelles, index sur les colonnes filtrées) ;
   - `alter table ... enable row level security;`
   - les policies. Jeu open data en lecture publique :
     ```sql
     create policy "Lecture publique" on public.deputies for select to anon, authenticated using (true);
     ```
     Aucune policy d'écriture pour `anon` sans validation humaine.
3. Import de données volumineuses : par lots via `execute_sql` (`insert ... values`) ou script serveur utilisant `getSupabaseAdminClient()` ; jamais depuis le navigateur.
4. `get_advisors` (security puis performance) : corriger toute alerte RLS ou index manquant.
5. `generate_typescript_types` → remplacer le contenu de `types/supabase.ts` par la sortie (fichier généré, jamais édité à la main). `pnpm typecheck`.

Validation humaine obligatoire avant : `drop`, `truncate`, `delete` de masse, désactivation de RLS, policy d'écriture publique.

## 2. Couche données `apis/<ressource>/`

Nom de dossier : la ressource au pluriel en anglais (`deputies`, `votes`, `bills`). Cinq fichiers :

- `types.ts` — types de domaine en camelCase, uniquement les champs utilisés. Aucun import de `@/types/supabase`.
- `request.ts` — seul fichier qui connaît Supabase :
  ```ts
  import { getSupabaseBrowserClient } from '@/services/supabase/client'
  import { unwrap } from '@/services/supabase/unwrap'
  import type { Deputy } from './types'

  export const getDeputyDetail = async (id: string): Promise<Deputy> => {
    const row = unwrap(
      await getSupabaseBrowserClient().from('deputies').select('id, full_name, group_id').eq('id', id).single()
    )
    return { id: row.id, fullName: row.full_name, groupId: row.group_id }
  }
  ```
  Toujours `select('col1, col2')` explicite (jamais `*`), toujours `unwrap`, toujours un mapping vers le type de domaine. Pagination : `.range(from, to)` + `{ count: 'exact' }` si besoin du total.
- `queries.ts` — `useQuery` / `useInfiniteQuery`, `queryKey: [QueryKeysEnum.GET_X, ...params]`, `enabled: !!id` quand un paramètre est requis, `staleTime` explicite pour les données open data quasi statiques (ex. `5 * 60_000`).
- `mutation.ts` — `useMutation`, puis `queryClient.invalidateQueries({ queryKey: [QueryKeysEnum.GET_X] })` sur **toutes** les requêtes touchées (ou patch du cache via `setQueriesData`).
- `index.ts` — `export * from './queries'`, `'./mutation'`, `'./request'`, `'./types'`.

Ajouter chaque clé dans `types/queryKeyEnum.ts` (`GET_DEPUTIES = 'GET_DEPUTIES'`).

## 3. Consommer dans une feature

Composant `'use client'` dans `features/<domaine>/components/` : `const { data, isPending, isError } = useGetDeputies(params)`. Gérer les quatre états : chargement (`Skeleton`), erreur (message i18n), vide (message i18n), rempli. Les calculs sur les données (agrégats, tris, layouts) vont dans `features/<domaine>/lib/` en TS pur avec test.

## 4. Vérifier

`pnpm check`, puis la page dans `pnpm dev`. Sur un déploiement : `/api/health` → `"supabase": "up"`.
