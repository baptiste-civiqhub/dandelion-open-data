import Form from 'next/form'
import { Search } from 'lucide-react'

import { Input } from '@/components/ui/input'
import { SEARCH_PARAMS } from '@/constant/path'
import { cn } from '@/lib/utils'

type SearchFieldProps = {
  /** Page de résultats (constante de `PUBLIC_PATHS`) : la soumission y navigue avec `?q=` en navigation client. */
  action: string
  /** Nom accessible du champ, déjà traduit. */
  label: string
  /** Texte indicatif, déjà traduit. */
  placeholder?: string
  defaultValue?: string
  className?: string
}

/**
 * Champ de recherche arrondi (formulaire GET `role='search'` via `next/form`) : fonctionne sans JavaScript,
 * prefetch la page de résultats et y navigue sans rechargement. Le paramètre est toujours `SEARCH_PARAMS.QUERY`.
 */
export function SearchField({ action, label, placeholder, defaultValue, className }: SearchFieldProps) {
  return (
    <Form action={action} role='search' data-slot='search-field' className={cn('w-full', className)}>
      <label className='relative flex items-center'>
        <span className='sr-only'>{label}</span>
        <Search aria-hidden className='text-muted-foreground pointer-events-none absolute left-3 size-4' />
        <Input
          type='search'
          name={SEARCH_PARAMS.QUERY}
          placeholder={placeholder}
          defaultValue={defaultValue}
          autoComplete='off'
          className='bg-secondary focus-visible:bg-background h-9 rounded-full border-transparent pl-9 shadow-none'
        />
      </label>
    </Form>
  )
}
