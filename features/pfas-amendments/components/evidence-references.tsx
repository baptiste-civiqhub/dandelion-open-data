'use client'

import { useTranslations } from 'next-intl'

import type { EvidenceSource } from '@/apis/pfas-evidence/types'

export function EvidenceReferences({ sourceIds, sources }: { sourceIds: string[]; sources: EvidenceSource[] }) {
  const t = useTranslations('pfasExperiment.evidence')
  return (
    <div className='flex flex-col gap-1 text-xs'>
      <span className='text-muted-foreground'>{t('note.sources')}</span>
      <ul className='flex flex-col gap-1'>
        {sourceIds.map((id) => {
          const source = sources.find((item) => item.id === id)
          if (!source) return null
          return (
            <li key={id}>
              <a
                href={source.url}
                target='_blank'
                rel='noopener noreferrer'
                className='text-primary focus-visible:ring-ring/50 rounded-sm break-words underline underline-offset-4 outline-none focus-visible:ring-3'
              >
                {source.title}
              </a>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
