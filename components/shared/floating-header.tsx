import type { ComponentProps } from 'react'

import { cva, type VariantProps } from 'class-variance-authority'

import { cn } from '@/lib/utils'

import { floatingSurface } from './floating-surface'

/**
 * Header flottant : pilule fixée en haut de l'écran, au-dessus du Stage, alignée sur les gouttières de sa grille
 * (inset-x-4 puis lg:inset-x-6, comme les colonnes). Composition par sections :
 * `<FloatingHeader><FloatingHeaderSection>…</FloatingHeaderSection>
 * <FloatingHeaderSection align='end'>…</FloatingHeaderSection></FloatingHeader>`.
 * Hauteur et marge fixes (top-4 + h-14) : le Stage réserve cet espace par son `pt-24` (stage.tsx). Les deux bougent
 * ensemble.
 */
export function FloatingHeader({ className, children, ...props }: ComponentProps<'header'>) {
  return (
    <header data-slot='floating-header' className={cn('fixed inset-x-4 top-4 z-50 lg:inset-x-6', className)} {...props}>
      <div className={cn(floatingSurface({ shape: 'pill' }), 'flex h-14 items-center gap-4 px-2 sm:gap-6 sm:px-3')}>
        {children}
      </div>
    </header>
  )
}

const sectionVariants = cva('flex items-center gap-2 sm:gap-4', {
  variants: {
    align: {
      // La marque et la navigation gardent leur taille ; la section de droite prend (et cède) l'espace restant.
      start: 'shrink-0',
      end: 'ml-auto min-w-0 flex-1 justify-end'
    }
  },
  defaultVariants: { align: 'start' }
})

type FloatingHeaderSectionProps = ComponentProps<'div'> & VariantProps<typeof sectionVariants>

/** Groupe d'éléments du header : `start` (marque, navigation) à gauche, `end` (recherche, actions) poussé à droite. */
export function FloatingHeaderSection({ align, className, ...props }: FloatingHeaderSectionProps) {
  return <div data-slot='floating-header-section' className={cn(sectionVariants({ align }), className)} {...props} />
}
