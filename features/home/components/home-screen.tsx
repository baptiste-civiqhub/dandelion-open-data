import { useTranslations } from 'next-intl'

import { Button } from '@/components/ui/button'
import { Card, CardAction, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { API_PATHS } from '@/constant/path'

import { SupabaseStatus } from './supabase-status'

export function HomeScreen() {
  const t = useTranslations('home')

  return (
    <main className='mx-auto flex min-h-screen w-full max-w-4xl flex-col justify-center gap-10 px-6 py-16'>
      <header className='flex flex-col gap-3'>
        <p className='text-muted-foreground text-sm font-medium tracking-wide uppercase'>{t('eyebrow')}</p>
        <h1 className='text-4xl font-bold tracking-tight'>{t('title')}</h1>
        <p className='text-muted-foreground max-w-2xl text-lg'>{t('subtitle')}</p>
      </header>

      <section className='grid gap-4 md:grid-cols-2'>
        <Card>
          <CardHeader>
            <CardTitle>{t('stackTitle')}</CardTitle>
            <CardDescription>{t('stackDescription')}</CardDescription>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>{t('dataTitle')}</CardTitle>
            <CardDescription>{t('dataDescription')}</CardDescription>
            <CardAction>
              <SupabaseStatus />
            </CardAction>
          </CardHeader>
        </Card>
      </section>

      <div>
        <Button asChild variant='outline'>
          <a href={API_PATHS.HEALTH}>{t('healthLink')}</a>
        </Button>
      </div>
    </main>
  )
}
