import { createBrowserClient } from '@supabase/ssr'

import type { Database } from '@/types/supabase'

import { getSupabasePublicConfig } from './config'

/**
 * Browser-side Supabase client (`'use client'` components, `apis/<resource>/request.ts` functions).
 * `createBrowserClient` is already a singleton in the browser: calling it on every request costs nothing.
 */
export function getSupabaseBrowserClient() {
  const { url, key } = getSupabasePublicConfig()
  return createBrowserClient<Database>(url, key)
}
