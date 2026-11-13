import { useTranslations } from 'next-intl'

import { BrandLockup } from '@/components/brand/brand-lockup'

export function HomeScreen() {
  const t = useTranslations('home')

  return (
    <main className='bg-background flex min-h-dvh items-center justify-center px-6 py-16'>
      <BrandLockup
        size='lg'
        titleAs='h1'
        name={t('title')}
        baseline={t('baseline')}
        className='motion-safe:animate-fade-up'
      />
    </main>
  )
}
