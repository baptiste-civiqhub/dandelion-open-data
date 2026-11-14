# CLAUDE.md

Guide pour Claude Code dans ce repo. Le guide canonique, partagé avec Cursor et les autres agents, est `AGENTS.md` : il est importé ci-dessous et fait foi.

@AGENTS.md

## Spécifique à Claude Code

- **Skills du repo** (`.claude/skills/`) : `creer-un-composant-ds` (avant tout JSX stylé), `ajouter-une-page`, `brancher-une-table-supabase`, `ecrire-un-test`, `preparer-le-portage`, `traduire-l-interface` (avant tout texte visible), `nommer` (avant tout fichier, type, variable, clé i18n ou clé de requête). Charge le skill correspondant avant la tâche.
- **MCP** (`.mcp.json`) : `supabase` et `vercel`. Au premier usage, l'utilisateur les authentifie (`claude` dans un terminal → `/mcp` → serveur → _Authenticate_). Un outil MCP absent de la session = serveur non authentifié : le signaler, ne pas le contourner par la CLI avec des secrets.
- **Permissions** (`.claude/settings.json`) : portes locales (`pnpm lint|typecheck|test|build|format`) et outils MCP en lecture pré-autorisés ; lecture des `.env*` locaux refusée. Préférences personnelles → `.claude/settings.local.json` (ignoré par Git).
- **Avant de rendre la main** : `pnpm check` (lint + typecheck + tests) vert, et `pnpm build` si la modification touche le routing, la config, le middleware ou `app/`.
- **Après une migration Supabase** : régénère `types/supabase.ts` (outil `generate_typescript_types`), relance `pnpm typecheck`, puis `get_advisors`.
