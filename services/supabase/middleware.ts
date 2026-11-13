import { createServerClient } from '@supabase/ssr'
import type { NextRequest, NextResponse } from 'next/server'

import { getSupabasePublicConfig, isSupabaseConfigured } from './config'

const AUTH_COOKIE_PREFIX = 'sb-'

/**
 * Refreshes the Supabase Auth token and rewrites the cookies on the response.
 * Without a session cookie (anonymous visitor, the open-data default) or without configuration: no network call.
 */
export async function refreshSupabaseSession(request: NextRequest, response: NextResponse) {
  const hasSessionCookie = request.cookies.getAll().some(({ name }) => name.startsWith(AUTH_COOKIE_PREFIX))
  if (!hasSessionCookie || !isSupabaseConfigured) return

  const { url, key } = getSupabasePublicConfig()
  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options))
        // Cache-Control / Expires / Pragma: keep a CDN from caching a response that carries auth cookies.
        Object.entries(headers).forEach(([headerName, value]) => response.headers.set(headerName, value))
      }
    }
  })

  // Nothing between creating the client and this call: it triggers the refresh.
  await supabase.auth.getClaims()
}
