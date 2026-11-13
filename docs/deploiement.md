# Déploiement — Vercel + Supabase + MCP

## Cibles

| Élément      | Valeur                                                                                                                                                                |
| ------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Repo GitHub  | `dandelion-open-data` (privé ; l'ancien nom `open-data-hemicycle` redirige), branche de prod `main`                                                                   |
| Supabase     | projet `mloaychfjhajdjfktcjp`, région `eu-central-1` (Francfort)                                                                                                      |
| URL Supabase | `https://mloaychfjhajdjfktcjp.supabase.co`                                                                                                                            |
| Vercel       | projet `dandelion-open-data` (anciennement `open-data-hemicycle`, déjà relié au repo), framework Next.js, racine du repo, région des fonctions `fra1` (`vercel.json`) |

## Variables d'environnement

| Variable                               | Portée                                               | Environnements Vercel                       | Source                                                                          |
| -------------------------------------- | ---------------------------------------------------- | ------------------------------------------- | ------------------------------------------------------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`             | navigateur + serveur                                 | Production, Preview, Development            | intégration Supabase, ou à la main                                              |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | navigateur + serveur (publique, protégée par la RLS) | Production, Preview, Development            | intégration Supabase, ou Dashboard → Project Settings → API Keys                |
| `SUPABASE_SECRET_KEY`                  | **serveur uniquement** (contourne la RLS)            | Production, Preview (Development si besoin) | intégration Supabase, ou Dashboard → API Keys (_secret_)                        |
| `ENABLE_EXPERIMENTAL_COREPACK` = `1`   | build                                                | Production, Preview                         | à la main : fait utiliser à Vercel exactement `pnpm@10.32.1` (`packageManager`) |
| `NEXT_PUBLIC_ENVIRONMENT`              | —                                                    | non nécessaire sur Vercel                   | déduite de `NEXT_PUBLIC_VERCEL_ENV`                                             |

L'intégration Supabase ↔ Vercel synchronise aussi `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_JWT_SECRET` et `POSTGRES_*` : inutilisées par l'app pour l'instant, sans danger (aucune n'est en `NEXT_PUBLIC_`).

## Mise en place (une fois)

1. **Accès à l'équipe Vercel** : le projet `dandelion-open-data` existe déjà et le repo y est relié. Vercel **bloque** tout déploiement dont l'auteur Git n'est pas membre de l'équipe (check « Git author … must have access to the project on Vercel »). Chaque développeur demande l'accès via le lien de ce check, le propriétaire de l'équipe l'accepte. Le plan Hobby n'accepte pas d'autres membres : l'équipe doit passer en Pro (essai gratuit disponible). Next.js et pnpm sont détectés ; ne rien changer aux commandes (`vercel.json` les fixe).
2. **Relier Supabase** :
   - _recommandé_ : intégration Supabase depuis le Vercel Marketplace (ou Supabase Dashboard → Integrations → Vercel), choisir le projet Vercel `dandelion-open-data` et le projet Supabase `mloaychfjhajdjfktcjp` : les variables ci-dessus sont créées dans les trois environnements ;
   - _sinon_ : saisir à la main `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY` dans Project Settings → Environment Variables.
3. Ajouter `ENABLE_EXPERIMENTAL_COREPACK=1` (Production + Preview).
4. **Redéployer** (Deployments → … → Redeploy) pour que le build prenne les variables.
5. **Vérifier** : `https://<domaine-vercel>/api/health` doit renvoyer `"status": "ok"` et `"supabase": "up"`. `"down"` = clé ou URL invalide ; `"unconfigured"` = variable manquante.
6. _Si Supabase Auth est utilisé plus tard_ : Supabase → Authentication → URL Configuration → ajouter le domaine de prod et `https://*-<équipe>.vercel.app/**` aux Redirect URLs.

## En local

```bash
cp .env.example .env.local           # puis renseigner NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
# ou, une fois le projet Vercel créé :
pnpm dlx vercel@latest link           # lie le dossier au projet Vercel (crée .vercel/, ignoré par Git)
pnpm dlx vercel@latest env pull .env.local
pnpm dev
```

## Cycle de vie

- Chaque PR → déploiement **Preview** (URL commentée sur la PR) + CI GitHub (`lint`, `typecheck`, `test`).
- Merge sur `main` → déploiement **Production**.
- Logs : MCP Vercel (`get_runtime_logs`, logs de build) ou dashboard Vercel.

## MCP

| Serveur  | URL                                                             | Fichiers                        |
| -------- | --------------------------------------------------------------- | ------------------------------- |
| supabase | `https://mcp.supabase.com/mcp?project_ref=mloaychfjhajdjfktcjp` | `.mcp.json`, `.cursor/mcp.json` |
| vercel   | `https://mcp.vercel.com`                                        | `.mcp.json`, `.cursor/mcp.json` |

Le serveur Supabase est **limité à ce projet** (`project_ref`) et en **lecture/écriture** pour permettre les migrations. Pour un accès en lecture seule, ajouter `&read_only=true` à l'URL.

Authentification (OAuth, une fois par poste) :

- **Claude Code** : ouvrir le repo, accepter les serveurs de `.mcp.json`, puis `claude` dans un terminal → `/mcp` → `supabase` → _Authenticate_ (idem `vercel`).
- **Cursor** : Settings → MCP → les serveurs de `.cursor/mcp.json` apparaissent avec _Needs login_ → se connecter.
