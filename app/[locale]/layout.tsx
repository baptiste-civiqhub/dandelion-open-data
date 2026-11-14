import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { hasLocale, NextIntlClientProvider } from 'next-intl'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import NextTopLoader from 'nextjs-toploader'

import { Toaster } from '@/components/ui/sonner'
import { ASSET_PATHS } from '@/constant/path'
import { LocaleSwitch } from '@/features/locale/components/locale-switch'
import { InterFont } from '@/fonts/inter'
import { routing } from '@/i18n/routing'

import { Providers } from '../providers'
import '../globals.css'

type LayoutParams = { params: Promise<{ locale: string }> }

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }))
}

export async function generateMetadata({ params }: LayoutParams): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'metadata' })

  return {
    title: {
      default: t('title'),
      template: `%s | ${t('title')}`
    },
    description: t('description'),
    icons: {
      icon: [{ url: ASSET_PATHS.BRAND_MARK, type: 'image/svg+xml' }]
    },
    openGraph: {
      title: t('title'),
      description: t('description'),
      type: 'website'
    }
  }
}

export default async function RootLayout({ children, params }: LayoutParams & { children: React.ReactNode }) {
  const { locale } = await params
  if (!hasLocale(routing.locales, locale)) {
    notFound()
  }

  setRequestLocale(locale)

  return (
    <html className={InterFont.variable} lang={locale}>
      <body>
        <NextIntlClientProvider>
          <LocaleSwitch />
          <NextTopLoader color='var(--color-brand)' showSpinner={false} />
          <Toaster />
          <Providers>{children}</Providers>
        </NextIntlClientProvider>
      </body>
    </html>
  )
}
