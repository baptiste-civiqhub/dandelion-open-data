import { defineRouting } from 'next-intl/routing'

export const routing = defineRouting({
  // The interface is in English. `fr` stays as a maintained secondary catalogue (same keys, checked by tests).
  locales: ['en', 'fr'],
  defaultLocale: 'en',
  // On so the NEXT_LOCALE cookie from the language switch is read. Accept-Language is overwritten
  // in middleware.ts: a French browser still lands on English until the visitor chooses.
  localeDetection: true,
  // The [locale] segment is structural: URLs never carry a language prefix.
  localePrefix: 'never'
})
