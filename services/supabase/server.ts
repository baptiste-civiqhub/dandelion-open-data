import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

import type { Database } from '@/types/supabase'

import { getSupabasePublicConfig } from './config'

/**
 * Supabase client bound to the user session (Server Components, Route Handlers, Server Actions).
 * Reading cookies makes the route dynamic: for public data, prefer `getSupabasePublicClient`.
 */
export async function createSupabaseServerClient() {
  const { url, key } = getSupabasePublicConfig()
  const cookieStore = await cookies()

  return createServerClient<Database>(url, key, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
        } catch {
          // Called from a Server Component (read-only cookies): middleware.ts refreshes the session.
        }
      }
    }
  })
}

/**
 * Anonymous Supabase client without cookies: cacheable public reads (open data), compatible with
 * static rendering / ISR. Subject to RLS like any visitor.
 */
export function getSupabasePublicClient() {
  const { url, key } = getSupabasePublicConfig()

  return createClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false }
  })
}
