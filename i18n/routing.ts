import { defineRouting } from 'next-intl/routing'

export const routing = defineRouting({
  // French is the default; both catalogues are kept at parity.
  locales: ['en', 'fr'],
  defaultLocale: 'fr',
  // On so the NEXT_LOCALE cookie from the language switch is read. Accept-Language is overwritten
  // in middleware.ts: the interface defaults to French until the visitor chooses another language.
  localeDetection: true,
  // The [locale] segment is structural: URLs never carry a language prefix.
  localePrefix: 'never'
})
