import { describe, expect, it } from 'vitest'

import { isActivePath } from './is-active-path'

describe('isActivePath', () => {
  it('matches the exact page', () => {
    expect(isActivePath('/about', '/about')).toBe(true)
    expect(isActivePath('/about/', '/about')).toBe(true)
  })

  it('matches sub-pages of a section', () => {
    expect(isActivePath('/datasets/population', '/datasets')).toBe(true)
  })

  it('does not match a sibling that merely shares a prefix', () => {
    expect(isActivePath('/datasets-archive', '/datasets')).toBe(false)
  })

  it('keeps home active on home only', () => {
    expect(isActivePath('/', '/')).toBe(true)
    expect(isActivePath('/about', '/')).toBe(false)
  })

  it('ignores query strings and hashes', () => {
    expect(isActivePath('/datasets?q=vote#top', '/datasets')).toBe(true)
  })
})
