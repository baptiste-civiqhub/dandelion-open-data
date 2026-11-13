# Stack — versions exactes

Cette stack est **identique** à celle de l'application de référence de l'équipe : mêmes paquets, mêmes versions résolues. Les versions sont épinglées exactement dans `package.json` (pas de `^`). Ne jamais en monter une pendant le hackathon : un écart de version, c'est un module qui ne se porte plus tel quel.

## Socle

| Domaine         | Paquet                                                       | Version                        |
| --------------- | ------------------------------------------------------------ | ------------------------------ |
| Runtime         | pnpm                                                         | 10.32.1                        |
| Framework       | next                                                         | 15.5.24                        |
| UI              | react / react-dom                                            | 19.2.1                         |
| Langage         | typescript                                                   | 5.8.3                          |
| Styling         | tailwindcss / @tailwindcss/postcss / @tailwindcss/node       | 4.1.3                          |
| Styling         | tw-animate-css                                               | 1.2.5                          |
| Styling         | class-variance-authority · clsx · tailwind-merge             | 0.7.1 · 2.1.1 · 3.2.0          |
| Primitives      | @radix-ui/react-slot                                         | 1.2.0                          |
| Primitives      | @radix-ui/react-dialog · alert-dialog · popover · hover-card | 1.1.7 · 1.1.7 · 1.1.7 · 1.1.15 |
| Primitives      | @radix-ui/react-dropdown-menu · select                       | 2.1.7 · 2.1.7                  |
| Primitives      | @radix-ui/react-tabs · tooltip · scroll-area                 | 1.1.4 · 1.2.0 · 1.2.4          |
| Primitives      | @radix-ui/react-checkbox · radio-group · switch · label      | 1.1.5 · 1.2.4 · 1.1.4 · 2.1.3  |
| Primitives      | @radix-ui/react-toggle · toggle-group · avatar               | 1.1.3 · 1.1.3 · 1.1.4          |
| Primitives      | vaul (drawer)                                                | 1.1.2                          |
| Icônes          | lucide-react                                                 | 0.487.0                        |
| Animation       | motion                                                       | 12.7.4                         |
| Données serveur | @tanstack/react-query                                        | 5.72.2                         |
| HTTP            | axios                                                        | 1.13.2                         |
| État UI         | zustand                                                      | 5.0.3                          |
| Formulaires     | react-hook-form · @hookform/resolvers                        | 7.55.0 · 5.0.1                 |
| Validation      | zod                                                          | 3.24.2                         |
| Env             | @t3-oss/env-nextjs                                           | 0.13.8                         |
| i18n            | next-intl                                                    | 4.0.2                          |
| Thème           | next-themes                                                  | 0.4.6                          |
| Navigation      | nextjs-toploader                                             | 3.8.16                         |
| Toasts          | sonner                                                       | 2.0.3                          |
| Dates           | date-fns                                                     | 4.1.0                          |
| Listes infinies | react-intersection-observer                                  | 10.0.2                         |
| Utilitaires     | lodash · @types/lodash                                       | 4.17.21 · 4.17.23              |
| Tests           | vitest                                                       | 4.1.5                          |
| Tests           | @playwright/test                                             | 1.63.0                         |
| Lint            | eslint · eslint-config-next · @eslint/eslintrc               | 9.24.0 · 15.5.24 · 3.3.1       |
| Format          | prettier · prettier-plugin-tailwindcss                       | 3.7.4 · 0.7.2                  |
| Types           | @types/node · @types/react · @types/react-dom                | 20.17.30 · 19.1.1 · 19.1.2     |

## Spécifique au hackathon (absent de la référence)

| Paquet                | Version | Où                                           |
| --------------------- | ------- | -------------------------------------------- |
| @supabase/supabase-js | 2.119.0 | `services/supabase/*` uniquement             |
| @supabase/ssr         | 0.12.7  | `services/supabase/*` uniquement             |
| supabase (CLI, dev)   | 3.1.0   | `pnpm supabase:login`, `pnpm supabase:types` |

Les deux premiers paquets ne doivent jamais être importés hors de `services/supabase/` et des `apis/*/request.ts` : c'est la frontière qui disparaît au portage.

**Police** : Inter (charte de marque), chargée par `next/font/google` (`fonts/inter.ts`) et exposée par le seul token `--font-sans`. La référence charge une autre police ; comme les composants n'utilisent que `font-sans`, ils se portent sans changement.

**Design system** : tokens générés par `scripts/build-tokens.mjs` depuis `design-system/tokens/source/brand.json`, même pipeline (`@theme static`, namespaces natifs Tailwind 4) que la référence. Voir `design-system/README.md`.

## Catalogue « à la demande » (présent dans la référence, non installé ici)

Si tu en as besoin, installe **exactement** cette version : `pnpm add --save-exact <paquet>@<version>`.

| Besoin                                   | Paquet                                                              | Version                |
| ---------------------------------------- | ------------------------------------------------------------------- | ---------------------- |
| Rendu Markdown                           | react-markdown · remark-gfm · rehype-sanitize                       | 10.1.0 · 4.0.1 · 6.0.0 |
| Éditeur riche                            | @tiptap/react · @tiptap/starter-kit · @tiptap/extension-placeholder | 3.22.4                 |
| Éditeur riche (Markdown)                 | tiptap-markdown                                                     | 0.9.0                  |
| Slugs                                    | slugify                                                             | 1.6.6                  |
| Carrousel                                | keen-slider                                                         | 6.8.6                  |
| Sélecteur de date                        | react-datepicker                                                    | 9.1.0                  |
| Code OTP                                 | input-otp                                                           | 1.4.2                  |
| Media queries JS                         | react-responsive                                                    | 10.0.1                 |
| Garde de navigation (formulaire modifié) | next-navigation-guard                                               | 0.2.0                  |

## Hors catalogue

Tout autre paquet (ex. dataviz) est autorisé s'il est indispensable, mais :

1. préférer du TS pur dans `lib/` + rendu SVG en React avec les tokens `--chart-1..5` ;
2. sinon, des modules ciblés et sans framework (ex. `d3-scale`, `d3-shape`, `d3-array`) plutôt qu'une librairie de charts complète ;
3. installer avec `--save-exact` et **le signaler dans la PR** (section « Nouvelle dépendance ») : il faudra l'ajouter à la référence au portage.

## shadcn/ui

`components.json` : style `new-york`, base `neutral`, CSS variables, icônes Lucide, alias `@/components/ui`. Pour ajouter une primitive (`pnpm dlx shadcn@latest add <composant>`), vérifier ensuite dans `package.json` que la dépendance Radix ajoutée correspond à la version du tableau ci-dessus (la CLI peut tirer une version plus récente, ou le paquet agrégé `radix-ui`) ; sinon corriger avec `pnpm add --save-exact @radix-ui/react-<x>@<version>` et adapter l'import.
