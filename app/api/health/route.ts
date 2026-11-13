// Sonde de santé : version déployée + joignabilité de Supabase. Sert à vérifier en un appel qu'un
// déploiement Vercel est bien relié au projet Supabase (bonnes variables, bonne clé).
// Exclue du middleware next-intl via le segment `/api` (voir middleware.ts).

import type { SupabaseStatus } from '@/apis/health/types'
import { ENVS } from '@/configs/env'
import pkg from '@/package.json'

import { buildHealthPayload } from './payload'

export const dynamic = 'force-dynamic'

const PROBE_TIMEOUT_MS = 3000

async function probeSupabase(): Promise<SupabaseStatus> {
  const url = ENVS.NEXT_PUBLIC_SUPABASE_URL
  const key = ENVS.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  if (!url || !key) return 'unconfigured'

  try {
    const response = await fetch(`${url}/auth/v1/health`, {
      headers: { apikey: key },
      cache: 'no-store',
      signal: AbortSignal.timeout(PROBE_TIMEOUT_MS)
    })
    return response.ok ? 'up' : 'down'
  } catch {
    return 'down'
  }
}

export async function GET() {
  return Response.json(
    buildHealthPayload({
      version: pkg.version,
      commit: process.env.VERCEL_GIT_COMMIT_SHA,
      environment: ENVS.NEXT_PUBLIC_ENVIRONMENT,
      supabase: await probeSupabase()
    })
  )
}
