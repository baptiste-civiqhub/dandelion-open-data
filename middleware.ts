import createMiddleware from 'next-intl/middleware'
import { NextRequest } from 'next/server'

import { isProduction } from '@/configs/env'
import { routing } from '@/i18n/routing'
import { refreshSupabaseSession } from '@/services/supabase/middleware'

const intlMiddleware = createMiddleware(routing)

// localeDetection must stay on for the NEXT_LOCALE cookie. Neutralizing Accept-Language keeps the default English.
function withEnglishAcceptLanguage(request: NextRequest): NextRequest {
  const headers = new Headers(request.headers)
  headers.set('accept-language', routing.defaultLocale)
  return new NextRequest(request, { headers })
}

export default async function middleware(request: NextRequest) {
  const response = intlMiddleware(withEnglishAcceptLanguage(request))

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
