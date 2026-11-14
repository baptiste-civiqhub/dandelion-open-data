import { getSupabasePublicClient } from '@/services/supabase/server'
import { unwrap } from '@/services/supabase/unwrap'

/** Textes d'un amendement relus côté serveur pour l'analyse (colonnes de R7, sans session ni clé secrète). */
export type AmendementTexts = {
  id: string
  numeroLong: string
  sort: string
  articleDesignation: string | null
  /** Tels que servis par la source : balisage HTML possible. */
  dispositif: string | null
  exposeSommaire: string | null
}

/**
 * Lecture publique (clé publiable, RLS) des amendements à analyser. Serveur uniquement : n'est pas réexportée par
 * `index.ts` pour ne jamais entrer dans un bundle navigateur.
 */
export const getAmendementTexts = async (amendementIds: readonly string[]): Promise<AmendementTexts[]> => {
  const rows = unwrap(
    await getSupabasePublicClient()
      .from('amendements')
      .select('id, numero_long, sort, dispositif, expose_sommaire, article:articles(designation)')
      .in('id', [...amendementIds])
  )
  return rows.map((row) => ({
    id: row.id,
    numeroLong: row.numero_long,
    sort: row.sort,
    articleDesignation: row.article?.designation ?? null,
    dispositif: row.dispositif,
    exposeSommaire: row.expose_sommaire
  }))
}
