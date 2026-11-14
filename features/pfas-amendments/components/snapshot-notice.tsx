import { useFormatter, useTranslations } from 'next-intl'

import type { PfasProvenance } from '@/apis/pfas-amendments/types'
import { Badge } from '@/components/ui/badge'

const linkClass =
  'text-primary rounded-sm underline underline-offset-4 outline-none focus-visible:ring-3 focus-visible:ring-ring/50'

export function SnapshotNotice({ provenance, rows }: { provenance: PfasProvenance; rows: number }) {
  const t = useTranslations('pfasExperiment.snapshot')
  const format = useFormatter()
  return (
    <section
      aria-labelledby='pfas-snapshot-title'
      className='bg-feedback-info-soft text-foreground flex flex-col gap-2 rounded-lg border p-4'
    >
      <div className='flex flex-wrap items-center gap-2'>
        <Badge variant='outline' className='bg-background'>
          {t('badge')}
        </Badge>
        <h2 id='pfas-snapshot-title' className='text-sm font-semibold'>
          {t('title', {
            date: format.dateTime(new Date(provenance.retrievedAtUtc), { dateStyle: 'long', timeZone: 'UTC' })
          })}
        </h2>
      </div>
      <p className='text-sm'>{t('warning')}</p>
      <details>
        <summary className='focus-visible:ring-ring/50 cursor-pointer rounded-sm text-sm font-medium outline-none focus-visible:ring-3'>
          {t('details')}
        </summary>
        <dl className='text-foreground-secondary mt-2 grid gap-x-4 gap-y-1 text-xs sm:grid-cols-2'>
          <div>
            <dt className='inline font-medium'>{t('retrievedAt')} </dt>
            <dd className='inline'>{provenance.retrievedAtUtc}</dd>
          </div>
          <div>
            <dt className='inline font-medium'>{t('rows')} </dt>
            <dd className='inline'>{rows}</dd>
          </div>
          <div className='sm:col-span-2'>
            <dt className='inline font-medium'>{t('sha256')} </dt>
            <dd className='inline font-mono break-all'>{provenance.sha256}</dd>
          </div>
          <div className='sm:col-span-2'>
            <dt className='inline font-medium'>{t('import')} </dt>
            <dd className='inline'>
              {provenance.importScript} v{provenance.parserVersion}
            </dd>
          </div>
        </dl>
      </details>
      <ul className='flex flex-wrap gap-x-4 gap-y-1 text-xs'>
        <li>
          <a className={linkClass} href={provenance.referenceTextUrl} target='_blank' rel='noopener noreferrer'>
            {t('referenceText')}
          </a>
        </li>
        <li>
          <a className={linkClass} href={provenance.referencePageUrl} target='_blank' rel='noopener noreferrer'>
            {t('referencePage')}
          </a>
        </li>
        <li>
          <a className={linkClass} href={provenance.datasetUrl} target='_blank' rel='noopener noreferrer'>
            {t('dataset')}
          </a>
        </li>
        <li>
          <a className={linkClass} href={provenance.licenceUrl} target='_blank' rel='noopener noreferrer'>
            {t('licence')}
          </a>
        </li>
      </ul>
    </section>
  )
}
