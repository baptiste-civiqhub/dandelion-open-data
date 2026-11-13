import { createClient } from '@supabase/supabase-js'

import { ENVS } from '@/configs/env'
import type { Database } from '@/types/supabase'

/**
 * Client Supabase avec la clé secrète : contourne la RLS. Serveur uniquement (Route Handlers,
 * Server Actions, scripts d'ingestion). Ne jamais l'importer depuis un fichier `'use client'`.
 */
export function getSupabaseAdminClient() {
  if (typeof window !== 'undefined') {
    throw new Error('getSupabaseAdminClient() est réservé au serveur.')
  }

  const secretKey = ENVS.SUPABASE_SECRET_KEY
  if (!secretKey) {
    throw new Error('SUPABASE_SECRET_KEY manquante : la définir dans .env.local et dans Vercel.')
  }

  return createClient<Database>(ENVS.NEXT_PUBLIC_SUPABASE_URL, secretKey, {
    auth: { persistSession: false, autoRefreshToken: false }
  })
}
