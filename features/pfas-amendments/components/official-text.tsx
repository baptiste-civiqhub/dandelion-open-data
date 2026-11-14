import { useTranslations } from 'next-intl'

import type { TextSegment } from '@/features/pfas-amendments/lib/lexical-diff'
import { cn } from '@/lib/utils'

type OfficialTextProps = {
  text: string
  segments?: TextSegment[]
  className?: string
}

// Texte officiel en français, rendu comme texte brut (jamais de HTML source), paragraphes conservés.
export function OfficialText({ text, segments, className }: OfficialTextProps) {
  const t = useTranslations('pfasExperiment')
  if (!text) return <p className='text-muted-foreground text-sm italic'>{t('amendment.empty')}</p>
  return (
    <p lang='fr' className={cn('text-sm leading-relaxed break-words whitespace-pre-line', className)}>
      {segments
        ? segments.map((segment, index) =>
            segment.unique ? (
              <mark key={index} className='bg-editorial-yellow text-foreground rounded-sm underline decoration-2'>
                <span className='sr-only'>{t('comparison.uniqueStart')}</span>
                {segment.text}
                <span className='sr-only'>{t('comparison.uniqueEnd')}</span>
              </mark>
            ) : (
              <span key={index}>{segment.text}</span>
            )
          )
        : text}
    </p>
  )
}
