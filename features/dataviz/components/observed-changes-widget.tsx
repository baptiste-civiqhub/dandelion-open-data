'use client'

import { useTranslations } from 'next-intl'
import { Widget, WidgetContent, WidgetDescription, WidgetHeader, WidgetTitle } from '@/components/shared/widget'
import type { ObservedChange } from '../lib/observed-changes'

export function ObservedChangesWidget({ signals, unassigned }: { signals: ObservedChange[]; unassigned: number }) {
  const t = useTranslations('observedChanges')
  return (
    <Widget data-testid='observed-changes' aria-labelledby='observed-changes-title'>
      <WidgetHeader>
        <WidgetTitle id='observed-changes-title'>{t('title')}</WidgetTitle>
        <WidgetDescription>{t('description')}</WidgetDescription>
      </WidgetHeader>
      <WidgetContent>
        <p className='text-muted-foreground text-xs'>{t('cutoffUnknown')}</p>
        {signals[0] ? (
          <p className='text-muted-foreground text-xs'>{t('asOf', { date: signals[0].as_of.slice(0, 10) })}</p>
        ) : null}
        {unassigned > 0 ? <p>{t('unassigned', { count: unassigned })}</p> : null}
        <div className='flex flex-col gap-2'>
          {signals.map((signal) => {
            const o = signal.observation
            const label =
              signal.subject.placement === 'A'
                ? signal.subject.label
                : t(`placement.${signal.subject.placement}`, { article: signal.subject.label })
            return (
              <details
                key={`${signal.subject.article_id}:${signal.subject.placement}`}
                className='rounded-md border p-3'
              >
                <summary className='cursor-pointer font-medium'>
                  {t('summary', { article: label, count: o.amendements_deposes })}
                </summary>
                <div className='mt-3 flex flex-col gap-2 text-sm'>
                  <p>{t('government', { count: o.dont_gouvernement })}</p>
                  <p className='text-muted-foreground'>
                    {t('coverage', {
                      loaded: o.amendements_charges,
                      unknown: o.dates_manquantes_ou_invalides,
                      excluded: o.dates_hors_perimetre
                    })}
                  </p>
                  {o.auteurs_non_renseignes > 0 ? (
                    <p>{t('missingAuthor', { count: o.auteurs_non_renseignes })}</p>
                  ) : null}
                  {o.sources_manquantes > 0 ? <p>{t('missingSources', { count: o.sources_manquantes })}</p> : null}
                  {o.amendements_deposes === 0 ? <p>{t('zero')}</p> : null}
                  <ul className='flex max-h-48 flex-col gap-1 overflow-y-auto'>
                    {signal.records.map((record) => (
                      <li key={record.id}>
                        {record.sourceUrl ? (
                          <a
                            href={record.sourceUrl}
                            className='text-primary underline'
                            target='_blank'
                            rel='noopener noreferrer'
                          >
                            {t('record', { numero: record.numero, date: record.date })}
                          </a>
                        ) : (
                          <span>{t('record', { numero: record.numero, date: record.date })}</span>
                        )}
                        {record.government ? ` · ${t('governmentLabel')}` : ''}
                      </li>
                    ))}
                  </ul>
                </div>
              </details>
            )
          })}
        </div>
        <p className='text-muted-foreground text-xs'>{t('limit')}</p>
      </WidgetContent>
    </Widget>
  )
}
