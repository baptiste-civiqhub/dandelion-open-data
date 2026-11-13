import { describe, expect, it } from 'vitest'

import { cn } from './utils'

describe('cn', () => {
  it('lets the last conflicting Tailwind utility win', () => {
    expect(cn('px-2 py-1', 'px-4')).toBe('py-1 px-4')
  })

  it('drops falsy conditional classes', () => {
    const isActive = false
    expect(cn('text-sm', isActive && 'font-bold', undefined, null)).toBe('text-sm')
  })
})
