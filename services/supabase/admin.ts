import { createClient } from '@supabase/supabase-js'

import { ENVS, SUPABASE_PROJECT_URL } from '@/configs/env'
import type { Database } from '@/types/supabase'

/**
 * Supabase client with the secret key: bypasses RLS. Server only (Route Handlers, Server Actions,
 * ingestion scripts). Never import it from a `'use client'` file.
 */
export function getSupabaseAdminClient() {
  if (typeof window !== 'undefined') {
    throw new Error('getSupabaseAdminClient() is server-only.')
  }

  const secretKey = ENVS.SUPABASE_SECRET_KEY
  if (!secretKey) {
    throw new Error('SUPABASE_SECRET_KEY is missing: set it in .env.local and in the Vercel project.')
  }

  return createClient<Database>(ENVS.NEXT_PUBLIC_SUPABASE_URL ?? SUPABASE_PROJECT_URL, secretKey, {
    auth: { persistSession: false, autoRefreshToken: false }
  })
}
