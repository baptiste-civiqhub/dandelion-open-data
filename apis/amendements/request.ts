import { getSupabaseBrowserClient } from '@/services/supabase/client'
import { unwrap } from '@/services/supabase/unwrap'

import type { AmendementSummary } from './types'

const PAGE_SIZE = 1000

/** Tous les amendements d'un texte, par pages de mille, dans l'ordre de discussion (`rang`, puis `id`). */
export const getAmendementsByTexte = async (texteId: string): Promise<AmendementSummary[]> => {
  const supabase = getSupabaseBrowserClient()
  const amendements: AmendementSummary[] = []

  for (let from = 0; ; from += PAGE_SIZE) {
    const rows = unwrap(
      await supabase
        .from('amendements')
        .select('id, numero_long, article_id, alinea_id, amendement_parent_id, division_avant_apres, rang, sort')
        .eq('texte_id', texteId)
        .order('rang')
        .order('id')
        .range(from, from + PAGE_SIZE - 1)
    )
    for (const row of rows) {
      amendements.push({
        id: row.id,
        numeroLong: row.numero_long,
        articleId: row.article_id,
        alineaId: row.alinea_id,
        parentId: row.amendement_parent_id,
        divisionAvantApres: row.division_avant_apres,
        rang: row.rang,
        sort: row.sort
      })
    }
    if (rows.length < PAGE_SIZE) break
  }

  return amendements
}
