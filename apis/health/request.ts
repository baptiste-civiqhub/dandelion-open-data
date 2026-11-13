import { API_PATHS } from '@/constant/path'
import { request } from '@/services/axios'

import type { HealthPayload } from './types'

export const getHealth = (): Promise<HealthPayload> => request<HealthPayload>({ url: API_PATHS.HEALTH, method: 'GET' })
