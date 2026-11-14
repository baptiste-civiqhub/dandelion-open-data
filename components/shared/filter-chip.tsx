import type { ComponentProps } from 'react'

import { cva } from 'class-variance-authority'
import { Check } from 'lucide-react'

import { cn } from '@/lib/utils'

const chipVariants = cva(
  'focus-visible:ring-ring/50 inline-flex h-8 shrink-0 cursor-pointer items-center gap-1.5 rounded-full border px-3 text-sm font-medium whitespace-nowrap transition-colors outline-none focus-visible:ring-3 disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      selected: {
        true: 'bg-primary text-primary-foreground border-transparent',
        false: 'bg-background text-foreground-secondary hover:bg-secondary'
      }
    },
    defaultVariants: { selected: false }
  }
)

type FilterChipProps = ComponentProps<'button'> & {
  selected?: boolean
  /** Nombre d'éléments que le filtre retient, affiché après le libellé. */
  count?: number
}

/**
 * Pastille de filtre à bascule (`aria-pressed`). L'état choisi est porté par le fond et par une coche, jamais par la
 * seule couleur.
 */
export function FilterChip({
  selected = false,
  count,
  className,
  children,
  type = 'button',
  ...props
}: FilterChipProps) {
  return (
    <button
      type={type}
      aria-pressed={selected}
      data-slot='filter-chip'
      className={cn(chipVariants({ selected }), className)}
      {...props}
    >
      {selected ? <Check aria-hidden className='size-3.5' /> : null}
      {children}
      {count === undefined ? null : (
        <span className={selected ? 'text-primary-foreground/80' : 'text-muted-foreground'}>{count}</span>
      )}
    </button>
  )
}

const listVariants = cva('flex gap-2 p-1', {
  variants: {
    layout: {
      // Une ligne qui défile horizontalement : accès rapide aux filtres sans prendre de hauteur.
      scroll: 'scrollbar-hidden overflow-x-auto',
      // Toutes les pastilles visibles, sur plusieurs lignes.
      wrap: 'flex-wrap'
    }
  },
  defaultVariants: { layout: 'scroll' }
})

type FilterChipListProps = ComponentProps<'div'> & {
  /** Nom accessible du groupe de filtres, déjà traduit. */
  label: string
  layout?: 'scroll' | 'wrap'
}

/** Groupe de `FilterChip`. Le `p-1` garde l'anneau de focus visible malgré le défilement. */
export function FilterChipList({ label, layout, className, ...props }: FilterChipListProps) {
  return (
    <div
      role='group'
      aria-label={label}
      data-slot='filter-chip-list'
      className={cn(listVariants({ layout }), className)}
      {...props}
    />
  )
}
