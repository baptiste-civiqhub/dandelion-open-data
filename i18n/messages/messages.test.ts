import { describe, expect, it } from 'vitest'

import en from './en.json'
import fr from './fr.json'

function flattenKeys(value: unknown, prefix = ''): string[] {
  if (typeof value !== 'object' || value === null) return [prefix]
  return Object.entries(value).flatMap(([key, child]) => flattenKeys(child, prefix ? `${prefix}.${key}` : key))
}

describe('i18n catalogs', () => {
  it('declare exactly the same keys in fr and en', () => {
    expect(flattenKeys(en).sort()).toEqual(flattenKeys(fr).sort())
  })
})
