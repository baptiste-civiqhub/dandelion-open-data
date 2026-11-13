import { ENVS, SUPABASE_PROJECT_URL } from '@/configs/env'

export const isSupabaseConfigured = Boolean(ENVS.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY)

/** URL + publishable key, or an explicit error when the key is missing (local .env.local or Vercel settings). */
export function getSupabasePublicConfig() {
  const key = ENVS.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  if (!key) {
    throw new Error(
      'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY is missing: set it in .env.local and in the Vercel project (see docs/deploiement.md).'
    )
  }

  return { url: ENVS.NEXT_PUBLIC_SUPABASE_URL ?? SUPABASE_PROJECT_URL, key }
}
