import { describe, expect, it } from 'vitest'

import { toSafeSenateUrl } from './source-url'

describe('toSafeSenateUrl', () => {
  it('normalizes protocol-relative and http Senate URLs to https', () => {
    expect(toSafeSenateUrl('//www.senat.fr/amendements/2023-2024/620/Amdt_26.html')).toBe(
      'https://www.senat.fr/amendements/2023-2024/620/Amdt_26.html'
    )
    expect(toSafeSenateUrl('http://www.senat.fr/a.html')).toBe('https://www.senat.fr/a.html')
  })

  it('rejects other hosts, look-alike hosts and non-http schemes', () => {
    expect(toSafeSenateUrl('https://evil.example/Amdt_26.html')).toBeNull()
    expect(toSafeSenateUrl('https://www.senat.fr.evil.example/x')).toBeNull()
    expect(toSafeSenateUrl('https://user@www.senat.fr/x')).toBeNull()
    expect(toSafeSenateUrl('javascript:alert(1)')).toBeNull()
  })

  it('returns null for empty values', () => {
    expect(toSafeSenateUrl('')).toBeNull()
    expect(toSafeSenateUrl(null)).toBeNull()
  })
})
