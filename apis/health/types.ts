export type SupabaseStatus = 'up' | 'down' | 'unconfigured'

export type HealthPayload = {
  status: 'ok' | 'degraded'
  version: string
  commit: string | null
  environment: string
  supabase: SupabaseStatus
}
