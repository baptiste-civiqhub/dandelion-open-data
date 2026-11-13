# Contrat de portabilité

Ce qui est développé pendant le hackathon doit être **transposable tel quel** dans l'application de référence de l'équipe (même stack : Next.js 15 App Router, React 19, TanStack Query, next-intl, Tailwind 4, shadcn/Radix). Ce document dit ce qui se porte, ce qui ne se porte pas, et comment écrire du code qui se porte sans réécriture.

## Ce qui se porte, couche par couche

| Couche                                                               | Se porte ?                                            | Au portage                                                                                                                       |
| -------------------------------------------------------------------- | ----------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| `lib/`, `features/*/lib/` (algorithmes, sélecteurs, calculs)         | **Tel quel**, tests compris                           | Copier les fichiers et leurs `*.test.ts`.                                                                                        |
| `apis/<ressource>/types.ts`                                          | **Tel quel**                                          | Types de domaine, aucune trace de Supabase.                                                                                      |
| `apis/<ressource>/queries.ts`, `mutation.ts`                         | **Tel quel**                                          | Ajouter les clés à `QueryKeysEnum` côté référence.                                                                               |
| `apis/<ressource>/request.ts`                                        | **Réécrit**                                           | Seul fichier qui change : appel Supabase → appel REST via le helper HTTP de la référence. Même signature, mêmes types de retour. |
| `features/*/components/`, `features/*/hooks/`                        | **Tel quel** si les règles ci-dessous sont respectées | Remapper les imports de primitives (`@/components/ui/*`) vers leurs équivalents de la référence.                                 |
| `components/ui/`                                                     | Non (primitives shadcn génériques)                    | La référence a ses propres primitives / son design system.                                                                       |
| `i18n/messages/*.json`                                               | Clés à fusionner                                      | Copier le namespace de la feature dans les catalogues de la référence (fr + en).                                                 |
| `services/supabase/`, `app/api/*`, `middleware.ts`, `configs/env.ts` | Non                                                   | Infrastructure propre au hackathon.                                                                                              |

## Règles qui rendent le portage gratuit

1. **Supabase ne sort jamais de `request.ts`.** Pas de `Database['public']['Tables'][...]` dans un composant, un hook ou un type de domaine. `request.ts` sélectionne les colonnes utiles et **mappe** chaque ligne (snake_case) vers le type de domaine (camelCase) de `types.ts`.

   ```ts
   // apis/deputies/request.ts
   import { getSupabaseBrowserClient } from '@/services/supabase/client'
   import { unwrap } from '@/services/supabase/unwrap'
   import type { Deputy } from './types'

   export const getDeputies = async (params: { groupId?: string } = {}): Promise<Deputy[]> => {
     let query = getSupabaseBrowserClient().from('deputies').select('id, full_name, group_id, seat_number')
     if (params.groupId) query = query.eq('group_id', params.groupId)
     const rows = unwrap(await query.order('full_name'))
     return rows.map((row) => ({
       id: row.id,
       fullName: row.full_name,
       groupId: row.group_id,
       seatNumber: row.seat_number
     }))
   }
   ```

2. **Données côté client via TanStack Query**, comme dans la référence (dont la plupart des écrans sont des composants client). Une page peut être un Server Component pour la mise en page, mais les données d'une feature passent par `useQuery` / `useInfiniteQuery`, pas par un `await supabase...` dans la page.
3. **Algorithmes purs** : entrées et sorties typées, pas d'I/O, pas de `Date.now()` ni d'aléatoire implicites (les passer en paramètre), pas d'import de framework — la règle ESLint `@typescript-eslint/no-restricted-imports` le bloque dans `lib/` et `features/*/lib/`. Chaque fonction exportée a un test.
4. **Tokens sémantiques uniquement** (`pnpm lint:ds` le garantit). Les tokens shadcn (`background`, `foreground`, `muted-foreground`, `primary`, `card`, `border`, `ring`, `destructive`…) et les échelles (espacement, rayon, typographie, élévation) ont **les mêmes noms et les mêmes valeurs d'échelle** que la référence : un composant qui ne consomme qu'eux se porte tel quel. Les tokens propres à la marque (`cta-*`, `stance-*`, `feedback-*`, `brand-*`, `content-*`, `editorial-*`, `chart-*`, `surface-raised`, `foreground-secondary`, `subtle-foreground`) doivent être ajoutés à la source de tokens de la référence au portage : les lister dans la PR (`design-system/tokens/palette.generated.md` donne leurs valeurs).
5. **Textes en clés i18n** dans un namespace propre à la feature (`useTranslations('deputies')`), en en (référence de l'interface) **et** fr.
6. **Clés de requête dans `QueryKeysEnum`**, préfixées par le verbe (`GET_DEPUTIES`, `GET_DEPUTY_DETAIL`), paramètres à la suite : `queryKey: [QueryKeysEnum.GET_DEPUTIES, params]`.
7. **Erreurs normalisées** : la couche données rejette une `NormalizedApiError` `{ status, code, detail, raw }` — même forme que la référence — et l'UI affiche `getApiErrorMessage(err, t('...'))`.
8. **Un composant = un fichier, export nommé, props typées**, `cn()` pour fusionner les classes, `asChild` avec un seul enfant.
9. **Pas de nouvelle dépendance hors catalogue** sans la signaler (voir `docs/stack.md`).

## Checklist avant de déclarer un module « portable »

- [ ] `pnpm check` vert.
- [ ] Aucun import de `@supabase/*` ou `@/services/supabase/*` hors de `services/` et `apis/*/request.ts` : `git grep -n "@supabase\|services/supabase" -- apis features lib components hooks store`.
- [ ] Aucune valeur visuelle brute : `pnpm lint:ds` vert.
- [ ] Tokens propres à la marque consommés par le module listés (à ajouter côté référence).
- [ ] Toutes les chaînes visibles sont des clés i18n présentes en en et fr.
- [ ] Les fonctions de `lib/` / `features/*/lib/` ont leurs tests.
- [ ] Les dépendances ajoutées sont listées dans la PR avec leur version exacte.
