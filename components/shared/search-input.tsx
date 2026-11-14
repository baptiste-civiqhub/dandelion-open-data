import type { ComponentProps } from 'react'

import { Search } from 'lucide-react'

import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

type SearchInputProps = Omit<ComponentProps<typeof Input>, 'type'> & {
  /** Nom accessible du champ, déjà traduit. */
  label: string
}

/**
 * Champ de recherche arrondi avec sa loupe. Contrôlé (`value` + `onChange`) pour filtrer une liste à la frappe, ou
 * non contrôlé (`name` + `defaultValue`) dans un formulaire : c'est le champ de `SearchField`.
 */
export function SearchInput({ label, className, ...props }: SearchInputProps) {
  return (
    <label data-slot='search-input' className={cn('relative flex items-center', className)}>
      <span className='sr-only'>{label}</span>
      <Search aria-hidden className='text-muted-foreground pointer-events-none absolute left-3 size-4' />
      <Input
        type='search'
        autoComplete='off'
        className='bg-secondary focus-visible:bg-background h-9 rounded-full border-transparent pl-9 shadow-none'
        {...props}
      />
    </label>
  )
}
