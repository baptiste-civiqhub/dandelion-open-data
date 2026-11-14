#!/usr/bin/env node
/**
 * Preuve de lecture du backend DANDELION : lit la légende `sorts` avec la clé publiable, comme un visiteur
 * (RLS, politique « lecture publique »). Le client est construit comme `getSupabasePublicClient()` de
 * services/supabase/server.ts, sans passer par les alias TypeScript du dépôt.
 * Échoue si la clé manque, si la lecture est refusée ou si la légende n'a pas ses huit sorts.
 *
 *   node --env-file=.env.local scripts/verify-supabase-read.mjs
 */
import { createClient } from '@supabase/supabase-js'

const EXPECTED_SORTS = 8
const DEFAULT_URL = 'https://mloaychfjhajdjfktcjp.supabase.co'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL || DEFAULT_URL
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY

if (!key) {
  console.error('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY est absente : renseigne-la dans .env.local (voir .env.example).')
  process.exit(1)
}

const supabase = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })

const { data, error, status } = await supabase
  .from('sorts')
  .select('code, label, display_order, color_token')
  .order('display_order')

if (error) {
  console.error(`Lecture de sorts refusée (HTTP ${status}) : ${error.message}`)
  process.exit(1)
}

console.table(data)

if (data.length !== EXPECTED_SORTS) {
  console.error(`${data.length} sorts lus, ${EXPECTED_SORTS} attendus.`)
  process.exit(1)
}

console.log(`OK : ${data.length} sorts lus sur ${url} avec la clé publiable.`)
