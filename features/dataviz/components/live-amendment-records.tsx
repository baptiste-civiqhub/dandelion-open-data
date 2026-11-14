'use client'

import { useTranslations } from 'next-intl'
import { useGetAmendementDetail } from '@/apis/amendements/queries'
import { Button } from '@/components/ui/button'
import { Widget, WidgetHeader, WidgetTitle, WidgetContent } from '@/components/shared/widget'
import { diffTexts, toSegments } from '@/features/pfas-amendments/lib/lexical-diff'
import type { ExplorerRecords } from '@/features/texte/components/flower-explorer'
import { normalizeDocumentText } from '../lib/area-flower'

export function LiveAmendmentRecords({
  texteId,
  state,
  sortLabels
}: {
  texteId: string
  state: ExplorerRecords
  sortLabels: Record<string, string>
}) {
  const t = useTranslations('liveArea')
  const comparing = state.selectedIds.length === 2
  const leftId = comparing ? state.selectedIds[0] : (state.openId ?? state.selectedIds[0])
  const rightId = comparing ? state.selectedIds[1] : undefined
  const left = useGetAmendementDetail(texteId, leftId ?? undefined)
  const right = useGetAmendementDetail(texteId, rightId)
  if (!leftId) return null
  const pending = left.isPending || (!!rightId && right.isPending)
  const error = left.isError || (!!rightId && right.isError)
  const a = normalizeDocumentText(left.data?.dispositif ?? null)
  const b = normalizeDocumentText(right.data?.dispositif ?? null)
  const diff = rightId && a && b ? diffTexts(a, b) : null
  const records = [left.data, ...(rightId ? [right.data] : [])].filter((record) => record !== undefined)
  return (
    <Widget data-testid='live-records' aria-labelledby='live-record-title'>
      <WidgetHeader>
        <WidgetTitle id='live-record-title'>{t(comparing ? 'comparison' : 'detail')}</WidgetTitle>
      </WidgetHeader>
      <WidgetContent>
        {pending ? (
          <p role='status'>{t('loading')}</p>
        ) : error ? (
          <div role='alert'>
            <p>{t('error')}</p>
            <Button
              onClick={() => {
                if (left.isError) void left.refetch()
                if (rightId && right.isError) void right.refetch()
              }}
            >
              {t('retry')}
            </Button>
          </div>
        ) : (
          <>
            {comparing ? (
              <p className='text-muted-foreground text-xs'>
                {t(!a || !b ? 'missingComparison' : !diff ? 'largeComparison' : 'lexicalNote')}
              </p>
            ) : null}
            <div className={comparing ? 'grid gap-4 xl:grid-cols-2' : 'flex flex-col gap-4'}>
              {records.map((record, index) => {
                const text = normalizeDocumentText(record.dispositif)
                const segments = diff ? toSegments(text, index === 0 ? diff.a : diff.b) : [{ text, unique: false }]
                return (
                  <section
                    key={record.id}
                    data-testid={`live-record-${record.numeroLong}`}
                    className='flex min-w-0 flex-col gap-2'
                  >
                    <h3 className='font-semibold'>{t('amendment', { numero: record.numeroLong })}</h3>
                    <p>{sortLabels[record.sort] ?? record.sort}</p>
                    {record.signataires ? <p className='text-muted-foreground text-xs'>{record.signataires}</p> : null}
                    <p className='text-sm break-words whitespace-pre-wrap'>
                      {text
                        ? segments.map((segment, i) =>
                            segment.unique ? (
                              <mark key={i} className='bg-chart-3/20 text-foreground underline decoration-dotted'>
                                {segment.text}
                              </mark>
                            ) : (
                              <span key={i}>{segment.text}</span>
                            )
                          )
                        : t('missingText')}
                    </p>
                    {record.exposeSommaire ? (
                      <details>
                        <summary className='cursor-pointer'>{t('expose')}</summary>
                        <p className='text-muted-foreground whitespace-pre-wrap'>
                          {normalizeDocumentText(record.exposeSommaire)}
                        </p>
                      </details>
                    ) : null}
                    {record.sourceUrl ? (
                      <a
                        href={record.sourceUrl}
                        target='_blank'
                        rel='noopener noreferrer'
                        className='text-primary underline'
                      >
                        {t('source')}
                      </a>
                    ) : (
                      <p className='text-muted-foreground text-xs'>{t('missingSource')}</p>
                    )}
                    {!comparing ? (
                      <Button variant='outline' onClick={() => state.compare(record.id)}>
                        {t('selectCompare')}
                      </Button>
                    ) : null}
                  </section>
                )
              })}
            </div>
            {state.selectedIds.length === 1 ? <p>{t('chooseSecond')}</p> : null}
          </>
        )}
        <Button variant='ghost' onClick={state.close}>
          {t('clear')}
        </Button>
      </WidgetContent>
    </Widget>
  )
}
