# Dandelion Open Data — guide agent

Frontend web du hackathon Open Data (samedi 14 novembre 2026). Application **Next.js 15 (App Router) + React 19 + TypeScript 5 strict**, données dans **Supabase** (Postgres + RLS), déployée sur **Vercel**.

> **Contrainte n°1 : la portabilité.** Ce repo reproduit **à l'identique** la stack frontend de l'application de référence de l'équipe (mêmes paquets, mêmes versions exactes, mêmes conventions, même arborescence). Tout ce qui est construit ici — modules, hooks, composants, algorithmes — doit pouvoir être transposé tel quel dans cette application après le hackathon. Avant d'écrire du code, lis [`docs/portabilite.md`](docs/portabilite.md). En cas de doute entre « plus rapide » et « portable », choisis portable.

Références : [`docs/stack.md`](docs/stack.md) (versions exactes, catalogue de dépendances autorisées) · [`docs/portabilite.md`](docs/portabilite.md) (contrat de portage) · [`docs/deploiement.md`](docs/deploiement.md) (Vercel + Supabase + MCP) · [`design-system/README.md`](design-system/README.md) (tokens, factorisation des composants) · [`design-system/BRAND.md`](design-system/BRAND.md) (marque) · [`design-system/MOTION.md`](design-system/MOTION.md) (mouvement, picto animé) · [`design-system/components.md`](design-system/components.md) (registre des composants) · [`docs/webui.md`](docs/webui.md) (architecture de l'interface : header, Stage, widgets, scènes WebGL).

> **Langue** : les échanges et la documentation peuvent être en français, mais **l'interface est en français**, à la demande explicite de Wilfred pour cette branche d’intégration (tout texte visible = clé i18n, catalogues `fr.json` et `en.json` maintenus à parité).

## Gestionnaire de paquets

pnpm **10.32.1** exclusivement (`packageManager` dans `package.json`). Jamais npm ni yarn.

Toutes les versions sont **épinglées exactement** (pas de `^`) pour coller à la référence. Ne mets jamais à jour une dépendance du socle (`pnpm update`, `pnpm add next@latest`…). Ajouter une dépendance : regarde d'abord le catalogue de [`docs/stack.md`](docs/stack.md) et installe la version indiquée avec `pnpm add --save-exact <paquet>@<version>`. Une dépendance hors catalogue se signale dans la PR (elle rend le portage plus coûteux).

## Installation et commandes

```bash
pnpm install --frozen-lockfile
cp .env.example .env.local      # ou : pnpm dlx vercel env pull .env.local (projet Vercel lié)
pnpm dev                        # http://localhost:3000
```

| Besoin                                                                                   | Commande                                                             |
| ---------------------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| Dev (Turbopack, `:3000`)                                                                 | `pnpm dev`                                                           |
| Build prod                                                                               | `pnpm build`                                                         |
| Start prod                                                                               | `pnpm start`                                                         |
| Lint (`next/core-web-vitals` + `next/typescript` + règle de portabilité)                 | `pnpm lint`                                                          |
| Typecheck                                                                                | `pnpm typecheck`                                                     |
| Tests unitaires (vitest, `**/*.test.ts`)                                                 | `pnpm test` / `pnpm test:watch`                                      |
| Toutes les portes (lint, lint:ds, tokens:check, typecheck, tests)                        | `pnpm check`                                                         |
| Régénérer les tokens après édition de `design-system/tokens/source/brand.json`           | `pnpm tokens:build` (vérification : `pnpm tokens:check`)             |
| Garde-fou design system (aucune valeur visuelle brute)                                   | `pnpm lint:ds`                                                       |
| Format (Prettier : sans `;`, quotes simples y compris JSX, largeur 120, plugin Tailwind) | `pnpm format` / `pnpm format:check`                                  |
| Smoke Playwright (accueil + `/api/health`)                                               | `pnpm test:smoke` (`PLAYWRIGHT_CHANNEL=msedge` sur un poste Windows) |
| Régénérer les types Supabase                                                             | MCP `generate_typescript_types` ou `pnpm supabase:types`             |

Lint, typecheck, tests et build ne demandent aucune variable d'environnement : l'URL Supabase a une valeur par défaut et la clé publishable est optionnelle au build. Sans clé, les pages qui n'utilisent pas Supabase fonctionnent ; les clients Supabase lèvent une erreur explicite et `/api/health` renvoie `"supabase": "unconfigured"`. Si install, lint, tests ou build échouent **avant** ta modification : arrête-toi et signale-le, ne code pas par-dessus.

## Topologie

```
app/                    # App Router. Tout sous app/[locale]/ (next-intl, sans préfixe d'URL).
│   ├── [locale]/       #   layout.tsx (racine : html/body, providers), not-found.tsx
│   │   └── (stage)/    #   layout.tsx (SiteHeader rémanent) · page.tsx (landing WebGL) · about/ · datasets/[datasetId]/ · loading.tsx
│   ├── api/health/     #   sonde : version + joignabilité Supabase (vérifie un déploiement)
│   ├── brand/mark.svg/ #   icône du site, générée depuis la géométrie du picto et les tokens
│   ├── providers.tsx   #   QueryClientProvider (TanStack Query)
│   └── globals.css     #   Tailwind 4 + import des tokens générés (aucun token déclaré ici)
apis/<ressource>/       # Couche données par domaine : types.ts / request.ts / queries.ts / mutation.ts / index.ts
design-system/          # Foundations : tokens/source/brand.json (source) → tokens/generated.* ; motion.css ;
│                       #   README.md (règles), BRAND.md (marque), MOTION.md (mouvement), components.md (registre)
components/
├── ui/                 # Primitives shadcn re-thémées (button, card, badge, skeleton, sonner…)
├── brand/              # DandelionMark, DandelionLoader, InteractiveDandelionMark, BrandLockup
└── shared/             # Patterns sans métier : Stage, StageCanvas, Widget, FloatingHeader, HeaderNav, SearchField…
features/<domaine>/     # Composants riches par domaine produit (shell, world, dataviz, datasets, about)
│   ├── components/     #   UI de la feature
│   ├── hooks/          #   hooks de la feature
│   ├── scene/          #   fabriques de scène canvas/WebGL (contrat lib/stage/stage-scene.ts)
│   └── lib/            #   logique PURE (sélecteurs, calculs, algos) + tests co-localisés
lib/                    # Algorithmes et utilitaires PURS transverses (cn, calculs…) — portés tels quels
services/
├── axios.ts            # request<T>() : client HTTP unique (route handlers internes, API open data externes)
└── supabase/           # client.ts (navigateur) · server.ts (session / public) · admin.ts (clé secrète) · middleware.ts · unwrap.ts
configs/                # env.ts (@t3-oss/env-nextjs + zod), security-headers.ts
constant/               # path.ts (PUBLIC_PATHS, API_PATHS) — jamais de chemin en dur
hooks/                  # Hooks transverses
store/                  # Zustand : état UI uniquement, jamais de données serveur
types/                  # queryKeyEnum.ts, api-error.ts, supabase.ts (GÉNÉRÉ)
i18n/                   # routing.ts (en par défaut, sans détection), request.ts, navigation.ts, messages/en.json + fr.json
form/                   # Schémas Zod partagés (à créer au besoin ; messages = clés i18n)
fonts/                  # Inter (next/font/google, auto-hébergée)
scripts/                # build-tokens.mjs (pipeline de tokens), lint-raw-values.mjs (garde-fou DS)
test/e2e/               # Smoke Playwright
docs/                   # stack, portabilité, déploiement
```

## Règles d'or

1. **Données → TanStack Query via `apis/<ressource>/`.** `request.ts` appelle Supabase (`getSupabaseBrowserClient()` + `unwrap`) ou HTTP (`request()` de `services/axios.ts`) ; `queries.ts` / `mutation.ts` exposent `useQuery` / `useInfiniteQuery` / `useMutation` avec un `queryKey` tiré de `QueryKeysEnum` (`types/queryKeyEnum.ts`). Jamais `useEffect` + `fetch`, jamais de données serveur dans Zustand, jamais `supabase.from()` dans un composant.
2. **`request.ts` mappe les lignes Supabase vers les types de domaine de `types.ts`** (camelCase, champs utiles seulement). Aucun type `Database[...]` ne sort de `request.ts` : c'est ce qui permet de remplacer Supabase par l'API REST de la référence en ne réécrivant qu'un fichier.
3. **Logique pure dans `lib/` ou `features/<domaine>/lib/`**, sans import de React, Next, next-intl, Supabase ni `services/` (règle ESLint). `import type` depuis `apis/*/types` autorisé. Chaque fonction pure a son `*.test.ts` co-localisé.
4. **Server Components par défaut** ; `'use client'` en tête dès qu'il y a hook, handler ou API navigateur.
5. **Interface en français, aucun texte en dur dans le JSX** : `useTranslations('namespace')` (ou `getTranslations` côté serveur), clé ajoutée dans `i18n/messages/en.json` (référence) **et** `fr.json` (un test vérifie la parité).
6. **Design system obligatoire** : uniquement des utilitaires de tokens sémantiques (`bg-background`, `text-muted-foreground`, `bg-cta`, `border`, `rounded-lg`, `p-4`, `text-sm`…), classes fusionnées par `cn()`. Jamais de `#hex`, `rgb()`, `bg-[…]`, `p-[13px]`, `var(--palette-…)` ni `style={{…}}` visuel : `pnpm lint:ds` les refuse. Voir la section Design system ci-dessous.
7. **Variables d'environnement via `configs/env.ts`** uniquement (`ENVS.X`), jamais `process.env.X` dans un composant. Toute nouvelle variable : déclarée dans `configs/env.ts` + documentée dans `.env.example` + ajoutée sur Vercel.
8. **Chemins internes via `constant/path.ts`**, liens via `Link` de `@/i18n/navigation`.
9. **Erreurs** : la couche données rejette une `NormalizedApiError` (`types/api-error.ts`). Affichage : `toast.error(getApiErrorMessage(err, t('<clé de repli>')))` (`utils/error.ts`). Succès : `toast.success(t('...'))` (Sonner).
10. **Formulaires** : React Hook Form + `zodResolver(schema)`, soumission via un `useMutation`.
11. **Pas de commentaire** sauf pour expliquer un _pourquoi_ non évident.

## Design system (factorisation obligatoire)

Toute interface, même prototypée vite (« vibe-codée »), se construit **dans** le design system, jamais à côté. Détail : [`design-system/README.md`](design-system/README.md) ; procédure : skill `creer-un-composant-ds`.

- **Tokens** : source unique `design-system/tokens/source/brand.json` (palette de marque complète → tokens sémantiques). Les primitives `--palette-*` ne sont jamais consommées ; la palette Tailwind par défaut est désactivée. Token manquant → l'ajouter à la source + `pnpm tokens:build`, jamais de valeur en dur.
- **Familles réservées** : `cta-*` = actions transactionnelles uniquement ; `stance-*` = position individuelle sur 5 niveaux de Likert ; `feedback-*` = états système ; `brand-*` = identité (picto, icône, accents) ; `chart-*` = séries de données.
- **Couches** : `components/ui` (primitives) → `components/brand` → `components/shared` (patterns sans métier) → `features/<domaine>/components` (métier). Une couche n'importe que les couches inférieures ; un composant DS ne fait ni appel de données ni texte en dur.
- **Factoriser** : consulter `design-system/components.md` avant de créer ; étendre par variante `cva` plutôt que dupliquer ; **deux occurrences d'une même structure = extraction en composant partagé** dans la même PR ; toute création ou variante est ajoutée au registre.
- **Marque** : picto via `DandelionMark` / `renderDandelionSvg` uniquement (jamais redessiné), animé uniquement par ses variantes `motion` (`DandelionLoader`, `InteractiveDandelionMark`, cf. [`design-system/MOTION.md`](design-system/MOTION.md)), police Inter, WCAG AA, aucune information portée par la seule couleur. Voir [`design-system/BRAND.md`](design-system/BRAND.md).

## Supabase

- Projet `mloaychfjhajdjfktcjp`, région `eu-central-1` (Francfort), URL `https://mloaychfjhajdjfktcjp.supabase.co`. Vercel sert depuis `fra1` (même ville) : latence minimale.
- Clients (`services/supabase/`) :
  - `getSupabaseBrowserClient()` — composants client et `apis/*/request.ts` (cas par défaut) ;
  - `getSupabasePublicClient()` — lectures publiques côté serveur sans cookie (pages statiques / ISR) ;
  - `createSupabaseServerClient()` — côté serveur avec la session de l'utilisateur (rend la route dynamique) ;
  - `getSupabaseAdminClient()` — clé secrète, **contourne la RLS**, serveur uniquement (ingestion, route handlers). Jamais depuis un fichier `'use client'`.
- **RLS activée sur toute table exposée.** Lecture publique d'un jeu open data = policy `select` pour `anon`. Écriture = jamais depuis le navigateur sans policy explicite.
- Schéma : chaque changement passe par une **migration** (outil MCP `apply_migration`, nom en snake_case explicite), jamais un `ALTER` ad hoc via `execute_sql`. Après chaque migration : régénérer `types/supabase.ts` (MCP `generate_typescript_types`), puis lancer l'outil MCP `get_advisors` (sécurité + performance).
- Ne jamais désactiver la RLS, supprimer une table ou des données sans validation humaine explicite.

## Déploiement (Vercel)

Preview automatique par PR, production sur `main`. Région `fra1` (`vercel.json`). Variables : celles de `.env.example`, synchronisées par l'intégration Supabase ↔ Vercel ou saisies à la main ; le build passe sans elles, mais les données Supabase exigent `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. Vérification d'un déploiement : `GET /api/health` doit renvoyer `"supabase": "up"`. Détails : [`docs/deploiement.md`](docs/deploiement.md).

## MCP disponibles

- **supabase** — `https://mcp.supabase.com/mcp?project_ref=mloaychfjhajdjfktcjp` (limité à ce projet) : tables, migrations, SQL, logs, advisors, types, docs.
- **vercel** — `https://mcp.vercel.com` : projets, déploiements, logs de build et de runtime, docs.

Déclarés dans `.mcp.json` (Claude Code) et `.cursor/mcp.json` (Cursor). Authentification OAuth au premier usage. Les outils en lecture sont pré-autorisés pour Claude (`.claude/settings.json`) ; les écritures (`apply_migration`, `execute_sql`, déploiement) demandent confirmation.

## Frontières

- Ne jamais lire, logger ni committer un secret : `.env`, `.env.local`, `.env.*.local`. `.env.example` est le gabarit sans valeur réelle. Jamais de secret derrière `NEXT_PUBLIC_*` (inliné dans le bundle) : la clé secrète Supabase s'appelle `SUPABASE_SECRET_KEY`.
- Jamais de `force push`, jamais de merge automatique. Conventional Commits (`feat(scope): …`, `fix(scope): …`, `chore(scope): …`).
- S'arrêter et demander validation avant : une migration destructive, un changement de policy RLS, l'ajout d'une dépendance hors catalogue, une modification de `middleware.ts`, `app/[locale]/layout.tsx` ou `configs/env.ts`, une modification de la palette (`palette` dans `brand.json`) ou de la géométrie du pictogramme.
