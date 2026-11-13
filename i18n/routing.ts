import { defineRouting } from 'next-intl/routing'

export const routing = defineRouting({
  // The interface is in English. `fr` stays as a maintained secondary catalogue (same keys, checked by tests).
  locales: ['en', 'fr'],
  defaultLocale: 'en',
  // No Accept-Language detection: every visitor gets English, whatever the browser language.
  localeDetection: false,
  // The [locale] segment is structural: URLs never carry a language prefix.
  localePrefix: 'never'
})
