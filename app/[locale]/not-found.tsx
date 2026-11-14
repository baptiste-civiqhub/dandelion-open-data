import { useTranslations } from 'next-intl'

import { Button } from '@/components/ui/button'
import { PUBLIC_PATHS } from '@/constant/path'
import { LocaleSwitch } from '@/features/locale/components/locale-switch'
import { Link } from '@/i18n/navigation'

export default function NotFound() {
  const t = useTranslations('notFound')

  return (
    <main className='mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-4 px-6 text-center'>
      <LocaleSwitch className='fixed top-4 right-4 z-50' />
      <h1 className='text-2xl font-semibold'>{t('title')}</h1>
      <p className='text-muted-foreground text-sm'>{t('description')}</p>
      <Button asChild>
        <Link href={PUBLIC_PATHS.HOME}>{t('backHome')}</Link>
      </Button>
    </main>
  )
}
