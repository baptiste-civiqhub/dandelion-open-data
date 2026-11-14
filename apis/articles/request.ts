import { getSupabaseBrowserClient } from '@/services/supabase/client'
import { unwrap } from '@/services/supabase/unwrap'

import type { Article } from './types'

export const getArticlesByTexte = async (texteId: string): Promise<Article[]> => {
  const rows = unwrap(
    await getSupabaseBrowserClient()
      .from('articles')
      .select('id, designation, titre, ordre')
      .eq('texte_id', texteId)
      .order('ordre')
  )

  return rows.map((row) => ({ id: row.id, designation: row.designation, titre: row.titre, ordre: row.ordre }))
}
