import createMiddleware from 'next-intl/middleware'
import type { NextRequest } from 'next/server'

import { isProduction } from '@/configs/env'
import { routing } from '@/i18n/routing'
import { refreshSupabaseSession } from '@/services/supabase/middleware'

const intlMiddleware = createMiddleware(routing)

export default async function middleware(request: NextRequest) {
  const response = intlMiddleware(request)

  await refreshSupabaseSession(request, response)

  // Previews Vercel et local : jamais indexés.
  if (!isProduction) {
    response.headers.set('X-Robots-Tag', 'noindex, nofollow')
  }

  return response
}

export const config = {
  // Tout sauf /api, /trpc, /_next, /_vercel et les fichiers (chemins contenant un point).
  matcher: '/((?!api|trpc|_next|_vercel|.*\\..*).*)'
}
