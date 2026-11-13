import { describe, expect, it } from 'vitest'

import { supabaseStatusPresentation } from './supabase-status-presentation'

describe('supabaseStatusPresentation', () => {
  it('shows a success badge when Supabase is up', () => {
    expect(supabaseStatusPresentation('up')).toEqual({ labelKey: 'up', variant: 'success' })
  })

  it('shows a neutral badge when env vars are missing', () => {
    expect(supabaseStatusPresentation('unconfigured')).toEqual({ labelKey: 'unconfigured', variant: 'secondary' })
  })

  it('falls back to the error label when the probe itself failed', () => {
    expect(supabaseStatusPresentation(undefined)).toEqual({ labelKey: 'error', variant: 'destructive' })
  })
})
