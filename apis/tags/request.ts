import { getSupabaseBrowserClient } from '@/services/supabase/client'
import { unwrap } from '@/services/supabase/unwrap'

import type { GetTagsParams, Tag } from './types'

export const getTags = async (params: GetTagsParams = {}): Promise<Tag[]> => {
  let query = getSupabaseBrowserClient().from('tags').select('id, slug, label, category, description')
  if (params.category) query = query.eq('category', params.category)
  const rows = unwrap(await query.order('label'))

  return rows.map((row) => ({
    id: row.id,
    slug: row.slug,
    label: row.label,
    category: row.category,
    description: row.description
  }))
}
