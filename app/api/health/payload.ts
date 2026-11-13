import type { HealthPayload, SupabaseStatus } from '@/apis/health/types'

type HealthInput = {
  version: string
  commit?: string
  environment: string
  supabase: SupabaseStatus
}

export function buildHealthPayload({ version, commit, environment, supabase }: HealthInput): HealthPayload {
  return {
    status: supabase === 'up' ? 'ok' : 'degraded',
    version,
    commit: commit ? commit.slice(0, 7) : null,
    environment,
    supabase
  }
}
