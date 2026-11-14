import Image from 'next/image'
import { useTranslations } from 'next-intl'

import { Stage } from '@/components/shared/stage'
import { Widget, WidgetContent, WidgetHeader, WidgetTitle } from '@/components/shared/widget'

export function AboutScreen() {
  const t = useTranslations('about')

  return (
    <Stage>
      <Widget aria-labelledby='about-title'>
        <WidgetHeader>
          <WidgetTitle id='about-title' className='text-2xl'>
            {t('title')}
          </WidgetTitle>
        </WidgetHeader>
        <WidgetContent className='text-foreground-secondary text-md leading-relaxed'>
          <p>{t('intro')}</p>
          <p>{t('howItWorks')}</p>
          <section className='mt-4 flex flex-col gap-3 border-t pt-4' aria-labelledby='governance-title'>
            <h2 id='governance-title' className='text-lg font-semibold'>
              {t('governance.title')}
            </h2>
            <a
              href='https://suzan.ai/'
              target='_blank'
              rel='noopener noreferrer'
              className='bg-background w-fit rounded-md p-3'
              aria-label={t('governance.link')}
            >
              <Image src='/partners/suzan-official.png' alt='Suzan AI' width={200} height={61} />
            </a>
            <p>{t('governance.description')}</p>
            <p className='text-muted-foreground text-sm'>{t('governance.status')}</p>
            <p className='text-muted-foreground text-sm'>{t('governance.scope')}</p>
          </section>
        </WidgetContent>
      </Widget>
    </Stage>
  )
}
