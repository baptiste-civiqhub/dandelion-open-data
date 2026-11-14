import Form from 'next/form'

import { SEARCH_PARAMS } from '@/constant/path'
import { cn } from '@/lib/utils'

import { SearchInput } from './search-input'

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
      <SearchInput label={label} name={SEARCH_PARAMS.QUERY} placeholder={placeholder} defaultValue={defaultValue} />
    </Form>
  )
}
