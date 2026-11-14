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
        </WidgetContent>
      </Widget>
    </Stage>
  )
}
