import { describe, expect, it } from 'vitest'

import { createRandom } from './seeded-random'

describe('createRandom', () => {
  it('is deterministic for a given seed', () => {
    const a = createRandom(42)
    const b = createRandom(42)
    expect([a(), a(), a()]).toEqual([b(), b(), b()])
  })

  it('stays within ]0, 1[', () => {
    const rnd = createRandom(1)
    for (let i = 0; i < 1000; i++) {
      const v = rnd()
      expect(v).toBeGreaterThan(0)
      expect(v).toBeLessThan(1)
    }
  })
})
