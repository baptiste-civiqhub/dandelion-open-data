'use client'

import { useLocale, useTranslations } from 'next-intl'

import { Button } from '@/components/ui/button'
import { usePathname, useRouter } from '@/i18n/navigation'
import { routing } from '@/i18n/routing'
import { cn } from '@/lib/utils'

export function LocaleSwitch({ className }: { className?: string }) {
  const t = useTranslations('localeSwitch')
  const locale = useLocale()
  const router = useRouter()
  const pathname = usePathname()

  return (
    <div
      role='group'
      aria-label={t('label')}
      data-slot='locale-switch'
      className={cn('bg-secondary flex h-9 shrink-0 items-center gap-0.5 rounded-full border p-0.5', className)}
    >
      {routing.locales.map((code) => {
        const isCurrent = code === locale

        return (
          <Button
            key={code}
            type='button'
            size='sm'
            variant='ghost'
            aria-pressed={isCurrent}
            className={cn('h-7 rounded-full px-3 shadow-none', isCurrent && 'bg-background hover:bg-background')}
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
