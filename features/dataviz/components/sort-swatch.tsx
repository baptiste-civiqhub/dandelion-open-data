import { cn } from '@/lib/utils'

import { chartTokenForSort, type ChartToken } from '../lib/sort-colors'

export const SWATCH_CLASS: Record<ChartToken, string> = {
  'chart-1': 'bg-chart-1',
  'chart-2': 'bg-chart-2',
  'chart-3': 'bg-chart-3',
  'chart-4': 'bg-chart-4',
  'chart-5': 'bg-chart-5'
}

export const swatchClass = (colorToken: string) => SWATCH_CLASS[chartTokenForSort(colorToken)]

/** Pastille de couleur d'un sort : toujours accompagnée de son libellé (BR-S8). */
export function SortSwatch({ colorToken, className }: { colorToken: string; className?: string }) {
  return <span aria-hidden className={cn('size-3 shrink-0 rounded-full', swatchClass(colorToken), className)} />
}
