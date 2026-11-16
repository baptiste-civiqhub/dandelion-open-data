import { API_PATHS } from '@/constant/path'
import { request } from '@/services/axios'

import type { AmendementAnalysisRequest, AmendementAnalysisResponse } from './types'

/** Analyse sémantique d'un ou deux amendements par le route handler (inférence Featherless côté serveur). */
export const postAmendementAnalysis = (body: AmendementAnalysisRequest): Promise<AmendementAnalysisResponse> =>
  request<AmendementAnalysisResponse>({ url: API_PATHS.AMENDEMENT_ANALYSIS, method: 'POST', data: body })
