import { getSupabaseBrowserClient } from '@/services/supabase/client'
import { unwrap } from '@/services/supabase/unwrap'

import type { Article } from './types'

/** Articles d'un texte avec leurs alinéas (contrat R2). */
export const getArticlesByTexte = async (texteId: string): Promise<Article[]> => {
  const rows = unwrap(
    await getSupabaseBrowserClient()
      .from('articles')
      .select('id, designation, titre, ordre, alineas(id, numero)')
      .eq('texte_id', texteId)
      .order('ordre')
      .order('numero', { referencedTable: 'alineas' })
  )

  return rows.map((row) => ({
    id: row.id,
    designation: row.designation,
    titre: row.titre,
    ordre: row.ordre,
    alineas: (row.alineas ?? []).map((alinea) => ({ id: alinea.id, numero: alinea.numero }))
  }))
}
