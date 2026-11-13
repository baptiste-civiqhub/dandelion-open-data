---
name: ajouter-une-page
description: Ajouter une route (page) à l'App Router sous app/[locale]/ avec metadata traduites, chemin déclaré dans constant/path.ts, écran composé depuis features/<domaine>/ et clés i18n fr + en. À utiliser pour toute nouvelle page, vue ou URL de l'application.
---

# Ajouter une page

1. **Chemin** : déclarer la route dans `constant/path.ts` (`PUBLIC_PATHS.DEPUTIES = '/deputies'`). Les liens utilisent `Link` de `@/i18n/navigation` avec cette constante, jamais une chaîne en dur.
2. **Route** : `app/[locale]/<segment>/page.tsx`, page **fine** qui compose un écran de feature :
   ```tsx
   import type { Metadata } from 'next'
   import { getTranslations, setRequestLocale } from 'next-intl/server'

   import { DeputiesScreen } from '@/features/deputies/components/deputies-screen'

   type PageProps = { params: Promise<{ locale: string }> }

   export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
     const { locale } = await params
     const t = await getTranslations({ locale, namespace: 'deputies' })
     return { title: t('metaTitle') }
   }

   export default async function DeputiesPage({ params }: PageProps) {
     const { locale } = await params
     setRequestLocale(locale)
     return <DeputiesScreen />
   }
   ```
   Segment dynamique : `params: Promise<{ locale: string; deputyId: string }>`, puis `await params` (pattern Next 15).
3. **Écran** : `features/<domaine>/components/<domaine>-screen.tsx`. Server Component si purement statique ; sinon `'use client'` et données via les hooks de `apis/<ressource>/`.
4. **Textes** : namespace `<domaine>` ajouté dans `i18n/messages/fr.json` **et** `en.json` (le test `i18n/messages/messages.test.ts` échoue sinon).
5. **Layout partagé** entre plusieurs pages : route group `app/[locale]/(<nom>)/layout.tsx`. Le layout racine `app/[locale]/layout.tsx` ne se modifie qu'avec validation humaine.
6. **Vérifier** : `pnpm check`, puis la page dans `pnpm dev` (http://localhost:3000/<segment>, sans préfixe de langue).
