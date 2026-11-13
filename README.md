# open-data-hemicycle

Dépôt pour le hackathon Open Data du samedi 14 novembre, présenté par Swanbase et Hémicycle.

Frontend **Next.js 15 + React 19 + TypeScript**, données **Supabase**, déployé sur **Vercel**.

## Démarrer

```bash
corepack enable                     # pnpm 10.32.1 (champ packageManager)
pnpm install --frozen-lockfile
cp .env.example .env.local          # renseigner NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
pnpm dev                            # http://localhost:3000
```

Vérifier la connexion à Supabase : http://localhost:3000/api/health → `"supabase": "up"`.

## Commandes

| Commande                    | Rôle                               |
| --------------------------- | ---------------------------------- |
| `pnpm dev`                  | serveur de dev (Turbopack)         |
| `pnpm build` / `pnpm start` | build et serveur de production     |
| `pnpm check`                | lint + typecheck + tests unitaires |
| `pnpm format`               | Prettier                           |
| `pnpm test:smoke`           | smoke Playwright                   |

## Documentation

- [`AGENTS.md`](AGENTS.md) — conventions, architecture, règles (lu par les agents Claude Code et Cursor)
- [`docs/stack.md`](docs/stack.md) — versions exactes et dépendances autorisées
- [`docs/portabilite.md`](docs/portabilite.md) — écrire du code réutilisable après le hackathon
- [`docs/deploiement.md`](docs/deploiement.md) — Vercel, Supabase, MCP

Licence : [Apache 2.0](LICENSE).
