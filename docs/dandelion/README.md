# Backend DANDELION

DANDELION affiche un texte de loi sous forme d'arbre : le texte, ses articles, leurs alinéas, les amendements déposés sur chaque article, leurs sous-amendements, et le sort de chacun. Des tags thématiques permettent de filtrer.

Le backend est une base Supabase et rien d'autre : huit tables dans le schéma `public`, lues directement par le front-end à travers l'API REST de Supabase. Il n'y a pas de serveur applicatif, et le modèle ne compte ni vue ni fonction.

> **État au 14 novembre 2026.** La migration `20261114132027_dandelion_init` est appliquée au projet `mloaychfjhajdjfktcjp`. La recette (douze contrôles) et l'essai à blanc sont passés, le jeu d'essai est retiré : les huit tables existent. Un premier texte réel est chargé, le jeu `plffg-2026` (projet de loi de finances de fin de gestion pour 2026) : 10 articles, 9 alinéas, 217 amendements. Aucun tag n'est encore posé.

Le même projet héberge aussi une zone d'atterrissage de l'import : le schéma `raw` et quelques fonctions `raw_*` et `fetch_raw_*` dans `public`, posés par neuf migrations antérieures. Le front-end lit les huit tables, pas `raw` ; le passage de l'un à l'autre est décrit dans [`import.md`](import.md).

| Document                                 | Contenu                                                                    |
| ---------------------------------------- | -------------------------------------------------------------------------- |
| [`schema.md`](schema.md)                 | Les huit tables, le diagramme, le dictionnaire des colonnes, les règles    |
| [`api.md`](api.md)                       | Les requêtes que le front-end et les scripts doivent employer              |
| [`recette.sql`](recette.sql)             | Douze contrôles du schéma, à relancer après toute migration                |
| [`essai-a-blanc.sql`](essai-a-blanc.sql) | Un jeu fictif pour éprouver lectures, contraintes et nettoyage             |
| [`import.md`](import.md)                 | Charger un texte de `raw` vers les huit tables : fonction, règles, limites |

## Se connecter depuis le front-end

Projet Supabase `mloaychfjhajdjfktcjp`, région `eu-central-1`.

**Variables** (déjà décrites dans [`.env.example`](../../.env.example) et lues par `configs/env.ts`) :

| Variable                               | Rôle                                                                |
| -------------------------------------- | ------------------------------------------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`             | URL du projet. Valeur par défaut dans `configs/env.ts`.             |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Clé publiable : publique par conception, protégée par RLS. Lecture. |
| `SUPABASE_SECRET_KEY`                  | Clé secrète : contourne RLS. Scripts et serveur uniquement.         |

En local : `cp .env.example .env.local`, puis renseigner la clé publiable (Dashboard Supabase → Project Settings → API Keys, ou outil MCP `get_publishable_keys`).

**Clients** : ceux de `services/supabase/`, typés par `Database` (`types/supabase.ts`). Aucun autre client n'est à créer.

| Client                       | Usage                                                           |
| ---------------------------- | --------------------------------------------------------------- |
| `getSupabaseBrowserClient()` | Cas par défaut : `apis/<ressource>/request.ts`                  |
| `getSupabasePublicClient()`  | Lecture publique côté serveur, sans cookie                      |
| `getSupabaseAdminClient()`   | Clé secrète, scripts et route handlers. Jamais côté navigateur. |

**Exemple de lecture**, selon la convention du dépôt (Supabase ne sort jamais de `request.ts`) :

```ts
// apis/sorts/request.ts
import { getSupabaseBrowserClient } from '@/services/supabase/client'
import { unwrap } from '@/services/supabase/unwrap'

import type { Sort } from './types'

export const getSorts = async (): Promise<Sort[]> => {
  const rows = unwrap(
    await getSupabaseBrowserClient()
      .from('sorts')
      .select('code, label, display_order, color_token')
      .order('display_order')
  )
  return rows.map((row) => ({
    code: row.code,
    label: row.label,
    displayOrder: row.display_order,
    colorToken: row.color_token
  }))
}
```

Les autres lectures sont dans [`api.md`](api.md).

**Vérifier la connexion** sans lancer l'application :

```bash
node --env-file=.env.local scripts/verify-supabase-read.mjs
```

Le script lit `sorts` avec la clé publiable et doit afficher huit lignes.

## Qui a le droit d'écrire

- **Les visiteurs et le front-end : personne.** RLS est activée sur les huit tables avec une seule politique, « lecture publique ». Les rôles `anon` et `authenticated` n'ont que le droit `select` ; une écriture avec la clé publiable est refusée.
- **Les scripts de la plateforme**, avec la clé secrète (`SUPABASE_SECRET_KEY`), qui contourne RLS. Elle n'entre ni dans le dépôt, ni dans une variable `NEXT_PUBLIC_*`.
- Supprimer un jeu (`datasets`) supprime en cascade ses textes, articles, alinéas, amendements et liens de tags. Le vocabulaire `tags` reste.

## Appliquer une nouvelle migration

Le schéma ne change que par migration, jamais par un `alter` lancé à la main.

Toute nouvelle table active RLS et déclare ses politiques dans la même migration. Une migration destructive, un changement de politique RLS ou une suppression de données demandent une validation humaine avant exécution.

**Voie MCP** (celle d'`AGENTS.md`, serveur `supabase` authentifié) :

1. Vérifier l'existant : `list_tables` et `list_migrations`.
2. Appliquer : `apply_migration`, avec un nom explicite en snake_case et tout le SQL en une fois.
3. Versionner : relever la version avec `list_migrations` et enregistrer le même SQL dans `supabase/migrations/<version>_<nom>.sql`.
4. Contrôler : relancer [`recette.sql`](recette.sql) avec `execute_sql` (en adaptant les valeurs attendues si le schéma a grandi), puis `get_advisors` pour `security` et `performance`.
5. Régénérer les types : `generate_typescript_types` vers `types/supabase.ts`, puis `pnpm typecheck`.
6. Mettre à jour [`schema.md`](schema.md) et [`api.md`](api.md) dans la même pull request.

**Voie CLI** (celle qui a servi pour `dandelion_init`). Un humain lance une fois `pnpm supabase:login` puis `pnpm exec supabase link --project-ref mloaychfjhajdjfktcjp`. Ensuite :

```bash
pnpm exec supabase migration list --remote          # l'historique local doit égaler le distant
pnpm exec supabase migration new <nom_en_snake_case>  # puis écrire le SQL dans le fichier créé
pnpm exec supabase db push --remote --dry-run       # ne doit annoncer que la nouvelle migration
pnpm exec supabase db push --remote
pnpm exec supabase db query --remote -f docs/dandelion/recette.sql
pnpm exec supabase db advisors --remote --type security
pnpm exec supabase db advisors --remote --type performance
pnpm supabase:types && pnpm typecheck
```

Trois pièges rencontrés avec la CLI 3.1.0 :

- **Sans `--remote`, les commandes visent une base locale**, pas le projet.
- **La recette ne se lance pas avec `--read-only`.** Ce mode interroge avec le rôle `supabase_read_only_user`, qui ne voit pas les droits des autres rôles dans `information_schema` : le contrôle 10 rend alors `0` au lieu de `16` alors que les droits sont bons.
- **`db push` refuse de pousser si le distant a des migrations absentes du dépôt** (appliquées par MCP sans être versionnées). Les récupérer avec `pnpm exec supabase migration fetch --remote`. Ne pas suivre la suggestion `migration repair --status reverted`, qui falsifierait l'historique.

## Points d'attention pour le front-end

- **Libellés des sorts.** `sorts.label` est en français, alors que l'interface du dépôt est en anglais par clés i18n. Le `code` est stable : il peut servir de clé i18n si le libellé doit être traduit.
- **Couleurs des sorts.** `sorts.color_token` nomme cinq variables CSS (`--sort-adopte`, `--sort-rejete`, `--sort-non-vote`, `--sort-irrecevable`, `--sort-en-attente`) qui n'existent pas encore dans le design system. Elles sont à ajouter à `design-system/tokens/source/brand.json`.
- **Noms de colonnes Hémicycle.** Ils viennent de la documentation des jeux, pas d'une réponse de l'API : le script d'import doit les vérifier sur une réponse réelle.
