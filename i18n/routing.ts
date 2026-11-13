import { defineRouting } from 'next-intl/routing'

export const routing = defineRouting({
  locales: ['fr', 'en'],
  defaultLocale: 'fr',
  // Le segment [locale] est structurel : les URLs ne portent jamais de préfixe de langue.
  localePrefix: 'never'
})
