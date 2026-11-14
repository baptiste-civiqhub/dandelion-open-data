import { cva, type VariantProps } from 'class-variance-authority'

/**
 * Matière commune des éléments qui flottent au-dessus du canvas (header, widgets) : fond translucide flouté,
 * filet et ombre. Une seule définition : header et widgets ne divergent jamais visuellement.
 * `shape` règle seulement l'arrondi : `pill` (header, champs) · `panel` (widgets).
 */
export const floatingSurface = cva('bg-background/80 text-foreground border shadow-lg backdrop-blur-md', {
  variants: {
    shape: {
      pill: 'rounded-full',
      panel: 'rounded-2xl'
    }
  },
  defaultVariants: { shape: 'panel' }
})

export type FloatingSurfaceProps = VariantProps<typeof floatingSurface>
