'use client'

import { useTranslations } from 'next-intl'

import type { Amendment } from '@/apis/texte/types'
import { Button } from '@/components/ui/button'
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { classifyIntention } from '@/features/texte/lib/classify-intention'

const EXCERPT_LENGTH = 280

type AmendmentCardProps = {
  amendment: Amendment
  onClose: () => void
}

export function AmendmentCard({ amendment, onClose }: AmendmentCardProps) {
  const t = useTranslations('texte')
  const intention = classifyIntention(amendment.dispositif)
  const excerpt = amendment.dispositif.slice(0, EXCERPT_LENGTH)
  const value = (text: string | null) => (text && text.length > 0 ? text : t('unknown'))

  return (
    <Card className='w-full shrink-0 lg:w-96'>
      <CardHeader>
        <CardTitle>{amendment.numero}</CardTitle>
        <CardDescription>{amendment.article}</CardDescription>
      </CardHeader>
      <dl className='flex flex-col gap-3 px-6 text-sm'>
        <div>
          <dt className='text-muted-foreground'>{t('sheet.author')}</dt>
          <dd>{value(amendment.authorLabel)}</dd>
        </div>
        <div>
          <dt className='text-muted-foreground'>{t('sheet.group')}</dt>
          <dd>{value(amendment.groupLabel)}</dd>
        </div>
        <div>
          <dt className='text-muted-foreground'>{t('sheet.intention')}</dt>
          <dd>{t(`intentions.${intention}`)}</dd>
        </div>
        <div>
          <dt className='text-muted-foreground'>{t('sheet.dispositif')}</dt>
          <dd>{excerpt.length > 0 ? excerpt : t('unknown')}</dd>
        </div>
        <div>
          <dt className='text-muted-foreground'>{t('sheet.sort')}</dt>
          <dd>{value(amendment.sort)}</dd>
        </div>
      </dl>
      <div className='px-6'>
        <Button type='button' variant='outline' onClick={onClose}>
          {t('sheet.close')}
        </Button>
      </div>
    </Card>
  )
}
