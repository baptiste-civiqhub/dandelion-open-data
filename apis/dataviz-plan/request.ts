import { API_PATHS } from '@/constant/path'
import { request } from '@/services/axios'

import type { DatavizPlanRequest, DatavizPlanResponse } from './types'

export const postDatavizPlan = (body: DatavizPlanRequest): Promise<DatavizPlanResponse> =>
  request<DatavizPlanResponse>({ url: API_PATHS.DATAVIZ_PLAN, method: 'POST', data: body })
