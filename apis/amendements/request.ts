import { getSupabaseBrowserClient } from '@/services/supabase/client'
import { unwrap } from '@/services/supabase/unwrap'
import type { NormalizedApiError } from '@/types/api-error'

import type { AmendementDetail, AmendementSummary } from './types'

const PAGE_SIZE = 1000

export const AMENDEMENT_NOT_FOUND = 'AMENDEMENT_NOT_FOUND'

/** Tous les amendements d'un texte (contrat R5), par pages de mille, dans l'ordre de discussion (`rang`, puis `id`). */
export const getAmendementsByTexte = async (texteId: string): Promise<AmendementSummary[]> => {
  const supabase = getSupabaseBrowserClient()
  const amendements: AmendementSummary[] = []

  for (let from = 0; ; from += PAGE_SIZE) {
    const rows = unwrap(
      await supabase
        .from('amendements')
        .select(
          'id, numero_long, article_id, alinea_id, amendement_parent_id, division_avant_apres, rang, sort, groupe_politique_ref, discussion_commune, discussion_identique, tag_list_id'
        )
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
        sort: row.sort,
        groupePolitiqueRef: row.groupe_politique_ref,
        discussionCommune: row.discussion_commune,
        discussionIdentique: row.discussion_identique,
        tagListId: row.tag_list_id
      })
    }
    if (rows.length < PAGE_SIZE) break
  }

  return amendements
}

/** Fiche d'un amendement (contrat R7) : textes longs et emplacement lisible. */
export const getAmendementDetail = async (amendementId: string): Promise<AmendementDetail> => {
  const rows = unwrap(
    await getSupabaseBrowserClient()
      .from('amendements')
      .select(
        'id, numero_long, sort, signataires_affichable, groupe_politique_ref, dispositif, expose_sommaire, document_uri, division_avant_apres, article:articles(designation), alinea:alineas(numero)'
      )
      .eq('id', amendementId)
      .limit(1)
  )
  const row = rows[0]
  if (!row) {
    const notFound: NormalizedApiError = { status: 404, code: AMENDEMENT_NOT_FOUND, raw: null }
    throw notFound
  }

  return {
    id: row.id,
    numeroLong: row.numero_long,
    sort: row.sort,
    signataires: row.signataires_affichable,
    groupePolitiqueRef: row.groupe_politique_ref,
    dispositif: row.dispositif,
    exposeSommaire: row.expose_sommaire,
    documentUri: row.document_uri,
    articleDesignation: row.article?.designation ?? null,
    alineaNumero: row.alinea?.numero ?? null,
    divisionAvantApres: row.division_avant_apres
  }
}
