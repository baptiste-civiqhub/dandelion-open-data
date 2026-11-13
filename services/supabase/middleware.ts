import { createServerClient } from '@supabase/ssr'
import type { NextRequest, NextResponse } from 'next/server'

import { ENVS } from '@/configs/env'

const AUTH_COOKIE_PREFIX = 'sb-'

/**
 * Rafraîchit le jeton Supabase Auth et réécrit les cookies sur la réponse.
 * Sans cookie de session (visiteur anonyme, cas nominal de l'open data) : aucun appel réseau.
 */
export async function refreshSupabaseSession(request: NextRequest, response: NextResponse) {
  const hasSessionCookie = request.cookies.getAll().some(({ name }) => name.startsWith(AUTH_COOKIE_PREFIX))
  if (!hasSessionCookie) return

  const supabase = createServerClient(ENVS.NEXT_PUBLIC_SUPABASE_URL, ENVS.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options))
        // Cache-Control / Expires / Pragma : empêchent un CDN de mettre en cache une réponse portant des cookies d'auth.
        Object.entries(headers).forEach(([key, value]) => response.headers.set(key, value))
      }
    }
  })

  // Ne rien intercaler entre la création du client et cet appel : il déclenche le rafraîchissement.
  await supabase.auth.getClaims()
}
