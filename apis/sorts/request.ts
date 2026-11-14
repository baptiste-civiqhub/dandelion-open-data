import { getSupabaseBrowserClient } from '@/services/supabase/client'
import { unwrap } from '@/services/supabase/unwrap'

import type { Sort } from './types'

export const getSorts = async (): Promise<Sort[]> => {
  const rows = unwrap(
    await getSupabaseBrowserClient()
      .from('sorts')
      .select('code, label, display_order, color_token')
      .order('display_order')
  )

  return rows.map((row) => ({
    code: row.code,
    label: row.label,
    displayOrder: row.display_order,
    colorToken: row.color_token
  }))
}
