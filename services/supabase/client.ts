import { createBrowserClient } from '@supabase/ssr'

import { ENVS } from '@/configs/env'
import type { Database } from '@/types/supabase'

/**
 * Client Supabase côté navigateur (composants `'use client'`, fonctions `apis/<ressource>/request.ts`).
 * `createBrowserClient` est déjà un singleton dans le navigateur : l'appeler à chaque requête ne coûte rien.
 */
export function getSupabaseBrowserClient() {
  return createBrowserClient<Database>(ENVS.NEXT_PUBLIC_SUPABASE_URL, ENVS.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY)
}
