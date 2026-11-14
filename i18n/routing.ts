import { defineRouting } from 'next-intl/routing'

export const routing = defineRouting({
  // User override for the hackathon integration: the visible interface is French. `en` stays a maintained
  // catalogue (same keys, checked by tests).
  locales: ['en', 'fr'],
  defaultLocale: 'fr',
  // No Accept-Language detection: every visitor gets French, whatever the browser language.
  localeDetection: false,
  // The [locale] segment is structural: URLs never carry a language prefix.
  localePrefix: 'never'
})
