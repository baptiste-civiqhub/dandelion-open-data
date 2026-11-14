import type { NormalizedApiError } from '@/types/api-error'
import { getSupabaseBrowserClient } from '@/services/supabase/client'
import type { Database } from '@/types/supabase'
import { unwrap } from '@/services/supabase/unwrap'

import { safeDocumentUrl } from '@/features/dataviz/lib/area-flower'
import type { AmendementDetail, AmendementSummary, SunburstAmendementDetail } from './types'

const PAGE_SIZE = 1000

/** Tous les amendements d'un texte, par pages de mille, dans l'ordre de discussion (`rang`, puis `id`). */
export const getAmendementsByTexte = async (texteId: string): Promise<AmendementSummary[]> => {
  const supabase = getSupabaseBrowserClient()
  const amendements: AmendementSummary[] = []

  for (let from = 0; ; from += PAGE_SIZE) {
    const rows = unwrap(
      await supabase
        .from('amendements')
        .select(
          'id, numero_long, article_id, alinea_id, amendement_parent_id, division_avant_apres, rang, sort, document_uri, date_depot, type_auteur, groupe_politique_ref, discussion_commune, discussion_identique, tag_list_id'
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
        dateDepot: row.date_depot,
        typeAuteur: row.type_auteur,
        sourceUrl: safeDocumentUrl(row.document_uri),
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

export const getAmendementDetail = async (texteId: string, id: string): Promise<AmendementDetail> => {
  const row = unwrap<Pick<
    Database['public']['Tables']['amendements']['Row'],
    | 'id'
    | 'texte_id'
    | 'uid'
    | 'numero_long'
    | 'dispositif'
    | 'expose_sommaire'
    | 'signataires_affichable'
    | 'sort'
    | 'document_uri'
  > | null>(
    await getSupabaseBrowserClient()
      .from('amendements')
      .select('id, texte_id, uid, numero_long, dispositif, expose_sommaire, signataires_affichable, sort, document_uri')
      .eq('texte_id', texteId)
      .eq('id', id)
      .maybeSingle()
      .retry(false)
  )
  if (!row) throw { status: 404, code: 'AMENDEMENT_NOT_FOUND', raw: null }
  return {
    id: row.id,
    texteId: row.texte_id,
    uid: row.uid,
    numeroLong: row.numero_long,
    dispositif: row.dispositif,
    exposeSommaire: row.expose_sommaire,
    signataires: row.signataires_affichable,
    sort: row.sort,
    sourceUrl: safeDocumentUrl(row.document_uri)
  }
}

export const AMENDEMENT_NOT_FOUND = 'AMENDEMENT_NOT_FOUND'

/** Fiche d'un amendement (contrat R7) : textes longs et emplacement lisible. */
export const getSunburstAmendementDetail = async (amendementId: string): Promise<SunburstAmendementDetail> => {
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
    documentUri: safeDocumentUrl(row.document_uri),
    articleDesignation: row.article?.designation ?? null,
    alineaNumero: row.alinea?.numero ?? null,
    divisionAvantApres: row.division_avant_apres
  }
}
