import { getSupabaseBrowserClient } from '@/services/supabase/client'
import { unwrap } from '@/services/supabase/unwrap'
import type { NormalizedApiError } from '@/types/api-error'

import type { Area, AreaDetail } from './types'

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export const AREA_NOT_FOUND = 'AREA_NOT_FOUND'

export const getAreas = async (): Promise<Area[]> => {
  const supabase = getSupabaseBrowserClient()
  const [datasetsResponse, linksResponse] = await Promise.all([
    supabase.from('datasets').select('id, slug, name, description, tag_list_id, textes(id)').order('name'),
    supabase.from('tag_links').select('tag_list_id, tag_id').eq('target_type', 'dataset')
  ])
  const datasets = unwrap(datasetsResponse)
  const links = unwrap(linksResponse)

  const tagIdsByList = new Map<string, string[]>()
  for (const link of links) {
    const tagIds = tagIdsByList.get(link.tag_list_id)
    if (tagIds) tagIds.push(link.tag_id)
    else tagIdsByList.set(link.tag_list_id, [link.tag_id])
  }

  return datasets.map((row) => ({
    id: row.id,
    slug: row.slug,
    name: row.name,
    description: row.description,
    texteCount: row.textes.length,
    tagIds: tagIdsByList.get(row.tag_list_id) ?? []
  }))
}

/** `areaId` : le slug de la zone (forme de l'URL) ou son identifiant UUID. */
export const getAreaDetail = async (areaId: string): Promise<AreaDetail> => {
  const supabase = getSupabaseBrowserClient()
  const rows = unwrap(
    await supabase
      .from('datasets')
      .select(
        'id, slug, name, description, source_label, license, imported_at, tag_list_id, textes(id, uid, titre, etape_texte)'
      )
      .eq(UUID_PATTERN.test(areaId) ? 'id' : 'slug', areaId)
      .limit(1)
  )
  const row = rows[0]
  if (!row) {
    const notFound: NormalizedApiError = { status: 404, code: AREA_NOT_FOUND, raw: null }
    throw notFound
  }

  const links = unwrap(
    await supabase.from('tag_links').select('tags(id, slug, label, category)').eq('tag_list_id', row.tag_list_id)
  )

  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    description: row.description,
    sourceLabel: row.source_label,
    license: row.license,
    importedAt: row.imported_at,
    textes: row.textes.map((texte) => ({
      id: texte.id,
      uid: texte.uid,
      titre: texte.titre,
      etapeTexte: texte.etape_texte
    })),
    tags: links
      .map(({ tags: tag }) => ({ id: tag.id, slug: tag.slug, label: tag.label, category: tag.category }))
      .sort((a, b) => a.label.localeCompare(b.label))
  }
}
