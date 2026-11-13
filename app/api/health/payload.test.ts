import { describe, expect, it } from 'vitest'

import { buildHealthPayload } from './payload'

describe('buildHealthPayload', () => {
  it('reports ok when Supabase answers', () => {
    expect(
      buildHealthPayload({ version: '0.1.0', commit: 'abcdef1234567', environment: 'preview', supabase: 'up' })
    ).toEqual({ status: 'ok', version: '0.1.0', commit: 'abcdef1', environment: 'preview', supabase: 'up' })
  })

  it('reports degraded when Supabase is down or unconfigured', () => {
    expect(buildHealthPayload({ version: '0.1.0', environment: 'development', supabase: 'down' }).status).toBe(
      'degraded'
    )
    expect(buildHealthPayload({ version: '0.1.0', environment: 'development', supabase: 'unconfigured' }).status).toBe(
      'degraded'
    )
  })

  it('returns a null commit outside Vercel', () => {
    expect(buildHealthPayload({ version: '0.1.0', environment: 'development', supabase: 'up' }).commit).toBeNull()
  })
})
