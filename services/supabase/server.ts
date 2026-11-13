import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

import { ENVS } from '@/configs/env'
import type { Database } from '@/types/supabase'

/**
 * Client Supabase lié à la session de l'utilisateur (Server Components, Route Handlers, Server Actions).
 * Lire les cookies rend la route dynamique : pour des données publiques, préférer `getSupabasePublicClient`.
 */
export async function createSupabaseServerClient() {
  const cookieStore = await cookies()

  return createServerClient<Database>(ENVS.NEXT_PUBLIC_SUPABASE_URL, ENVS.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
        } catch {
          // Appelé depuis un Server Component (cookies en lecture seule) : middleware.ts rafraîchit la session.
        }
      }
    }
  })
}

/**
 * Client Supabase anonyme, sans cookie : lectures publiques (open data) cachables et compatibles
 * avec le rendu statique / ISR. Soumis à la RLS comme n'importe quel visiteur.
 */
export function getSupabasePublicClient() {
  return createClient<Database>(ENVS.NEXT_PUBLIC_SUPABASE_URL, ENVS.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false }
  })
}
