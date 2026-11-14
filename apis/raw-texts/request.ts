import { getSupabaseBrowserClient } from '@/services/supabase/client'
import { unwrap } from '@/services/supabase/unwrap'
import { parseRawPage, parseRawSummary } from '@/lib/hemicycle/raw-envelope'

import type { RawJeu, RawPage, RawExtractSummary } from './types'
import { RAW_PAGE_SIZE } from './types'

export const getRawExtractSummary = async (texteUid: string): Promise<RawExtractSummary | null> => {
  const data = unwrap(await getSupabaseBrowserClient().rpc('fetch_raw_summary', { p_texte_uid: texteUid }))

  return parseRawSummary(data)
}

export const getRawRows = async (args: { jeu: RawJeu; texteUid: string; offset: number }): Promise<RawPage> => {
  const data = unwrap(
    await getSupabaseBrowserClient().rpc('fetch_raw_rows', {
      p_jeu: args.jeu,
      p_texte_uid: args.texteUid,
      p_limit: RAW_PAGE_SIZE,
      p_offset: args.offset
    })
  )

  return parseRawPage(data)
}
