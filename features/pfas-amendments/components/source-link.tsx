import { ExternalLink } from 'lucide-react'
import { useTranslations } from 'next-intl'

import { toSafeSenateUrl } from '@/features/pfas-amendments/lib/source-url'

export function SourceLink({ url, number }: { url: string | null; number: string }) {
  const t = useTranslations('pfasExperiment.amendment')
  const safeUrl = toSafeSenateUrl(url)
  if (!safeUrl) return <span className='text-muted-foreground text-sm'>{t('noSource')}</span>
  return (
    <a
      href={safeUrl}
      target='_blank'
      rel='noopener noreferrer'
      className='text-primary focus-visible:ring-ring/50 inline-flex items-center gap-1 rounded-sm text-sm font-medium underline underline-offset-4 outline-none focus-visible:ring-3'
    >
      {t('openSource', { number })}
      <ExternalLink aria-hidden='true' className='size-3.5' />
    </a>
  )
}
