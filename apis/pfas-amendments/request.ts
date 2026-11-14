import { API_PATHS } from '@/constant/path'
import { request } from '@/services/axios'

import type { PfasSnapshot } from './types'

// Adaptateur en lecture seule : instantané versionné servi par app/api/pfas. Au portage (ou pour lire Supabase),
// seul ce fichier change, avec la même signature et le même type de retour.
export const getPfasSnapshot = (): Promise<PfasSnapshot> =>
  request<PfasSnapshot>({ url: API_PATHS.PFAS_AMENDMENTS, method: 'GET' })
