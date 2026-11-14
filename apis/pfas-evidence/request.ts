import { API_PATHS } from '@/constant/path'
import { parseEvidenceContext } from '@/features/pfas-amendments/lib/evidence-context'
import { request } from '@/services/axios'

import type { PfasEvidenceContext } from './types'

// Adaptateur en lecture seule : contexte documentaire versionné servi par app/api/pfas/evidence, validé ici.
export const getPfasEvidenceContext = async (amendmentIds: string[]): Promise<PfasEvidenceContext> =>
  parseEvidenceContext(await request<unknown>({ url: API_PATHS.PFAS_EVIDENCE, method: 'GET' }), amendmentIds)
