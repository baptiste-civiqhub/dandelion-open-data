'use client'

import { useLocale, useTranslations } from 'next-intl'

import { Button } from '@/components/ui/button'
import { usePathname, useRouter } from '@/i18n/navigation'
import { routing } from '@/i18n/routing'

export function LocaleSwitch() {
  const t = useTranslations('localeSwitch')
  const locale = useLocale()
  const router = useRouter()
  const pathname = usePathname()

  return (
    <div role='group' aria-label={t('label')} className='fixed top-4 right-4 z-50 flex gap-1'>
      {routing.locales.map((code) => {
        const isCurrent = code === locale

        return (
          <Button
            key={code}
            type='button'
            size='sm'
            variant={isCurrent ? 'secondary' : 'ghost'}
            aria-pressed={isCurrent}
            onClick={() => {
              if (!isCurrent) router.replace(pathname, { locale: code })
            }}
          >
            {t(code)}
          </Button>
        )
      })}
    </div>
  )
}
