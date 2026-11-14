import type { ReactNode } from 'react'

import { cva, type VariantProps } from 'class-variance-authority'

import { cn } from '@/lib/utils'

const columnVariants = cva(
  // Les colonnes laissent passer le pointeur vers le canvas ; seuls leurs enfants directs (widgets) le captent.
  'scrollbar-hidden pointer-events-none flex min-h-0 flex-col gap-4 overflow-y-auto *:pointer-events-auto lg:row-start-1',
  {
    variants: {
      // Sous lg, colonnes empilées : les latérales prennent leur hauteur, la centrale le reste.
      side: {
        left: 'shrink-0 lg:col-span-3 lg:col-start-1',
        center: 'flex-1 lg:col-span-6 lg:col-start-4',
        right: 'shrink-0 lg:col-span-3 lg:col-start-10'
      },
      align: {
        start: 'justify-start',
        center: 'items-center justify-center',
        end: 'justify-end'
      }
    },
    defaultVariants: { side: 'center', align: 'start' }
  }
)

type StageProps = {
  /** Calque de fond plein écran, toujours présent derrière l'interface : un `StageCanvas` de feature. */
  canvas?: ReactNode
  /** Widgets flottants de la colonne gauche (3/12). Absent : aucune colonne rendue. */
  left?: ReactNode
  /** Widgets flottants de la colonne droite (3/12). Absent : aucune colonne rendue. */
  right?: ReactNode
  /** Contenu de la colonne centrale (6/12), le plus souvent vide pour laisser voir le canvas. */
  children?: ReactNode
  /** Alignement vertical de la colonne centrale. */
  centerAlign?: VariantProps<typeof columnVariants>['align']
  className?: string
}

/**
 * Mise en page de toutes les pages de l'interface (docs/webui.md) : un canvas plein écran en fond, et par-dessus une
 * grille 3 · 6 · 3 dont les colonnes latérales accueillent des widgets flottants. Sous `lg`, les colonnes s'empilent
 * (gauche, centre extensible, droite).
 * Le haut de la grille réserve la place du header flottant (`pt-24` = top-4 + h-14 + respiration).
 */
export function Stage({ canvas, left, right, children, centerAlign, className }: StageProps) {
  return (
    <div data-slot='stage' className={cn('bg-background relative isolate h-dvh overflow-hidden', className)}>
      {canvas ? (
        <div data-slot='stage-canvas-layer' className='absolute inset-0 -z-10'>
          {canvas}
        </div>
      ) : null}
      <div
        data-slot='stage-overlay'
        className='pointer-events-none flex h-full flex-col gap-4 px-4 pt-24 pb-4 lg:grid lg:grid-cols-12 lg:gap-6 lg:px-6 lg:pb-6'
      >
        {left ? (
          <aside data-slot='stage-left' className={columnVariants({ side: 'left' })}>
            {left}
          </aside>
        ) : null}
        <div data-slot='stage-center' className={columnVariants({ side: 'center', align: centerAlign })}>
          {children}
        </div>
        {right ? (
          <aside data-slot='stage-right' className={columnVariants({ side: 'right' })}>
            {right}
          </aside>
        ) : null}
      </div>
    </div>
  )
}
