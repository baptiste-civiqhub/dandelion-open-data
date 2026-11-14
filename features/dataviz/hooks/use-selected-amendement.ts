'use client'

import { useLocale } from 'next-intl'

import type { AmendementAnalysisLocale } from '@/apis/amendement-analysis/types'
import type { AmendementSummary } from '@/apis/amendements/types'

import { useViewStore } from './use-sunburst-store'

/** Amendement épinglé (sélection), jamais celui survolé : aucune analyse ne dépend du survol. */
export function useSelectedAmendement(): AmendementSummary | null {
  const tree = useViewStore((state) => state.tree)
  const selectionId = useViewStore((state) => state.selectionId)
  return (selectionId ? tree?.byId.get(selectionId)?.amendement : null) ?? null
}

/** Langue dans laquelle le modèle rédige : celle de l'interface. */
export function useAnalysisLocale(): AmendementAnalysisLocale {
  return useLocale() === 'fr' ? 'fr' : 'en'
}
