import { describe, expect, it } from 'vitest'

import {
  classifierRetryDelayMs,
  featherlessKeysFromEnv,
  inferenceModelFilter,
  partitionByKey
} from './tag-articles.mjs'

describe('featherlessKeysFromEnv', () => {
  it('reads the two numbered keys and keeps a lone unnumbered key as the first', () => {
    expect(featherlessKeysFromEnv({ FEATHERLESS_API_KEY_1: 'one', FEATHERLESS_API_KEY_2: 'two' })).toEqual([
      'one',
      'two'
    ])
    expect(featherlessKeysFromEnv({ FEATHERLESS_API_KEY: 'one', FEATHERLESS_API_KEY_2: 'two' })).toEqual(['one', 'two'])
    expect(featherlessKeysFromEnv({ FEATHERLESS_API_KEY: 'one' })).toEqual(['one'])
  })

  it('ignores a second key that repeats the first', () => {
    expect(featherlessKeysFromEnv({ FEATHERLESS_API_KEY_1: 'same', FEATHERLESS_API_KEY_2: 'same' })).toEqual(['same'])
    expect(featherlessKeysFromEnv({})).toEqual([])
  })
})

describe('inferenceModelFilter', () => {
  it('keeps the model id as the filter value', () => {
    expect(inferenceModelFilter('featherless-ai/gemma-4-12B-it-classifier')).toBe(
      '&source=eq.inference&model=eq.featherless-ai%2Fgemma-4-12B-it-classifier'
    )
  })
})

describe('classifierRetryDelayMs', () => {
  it('honors a positive Retry-After and otherwise backs off', () => {
    expect(classifierRetryDelayMs('3', 1)).toBe(3000)
    expect(classifierRetryDelayMs(null, 1)).toBe(2000)
    expect(classifierRetryDelayMs('later', 4)).toBe(16000)
    expect(classifierRetryDelayMs(null, 8)).toBe(30000)
  })
})

describe('partitionByKey', () => {
  it('deals articles round-robin so both keys start together', () => {
    expect(partitionByKey(['a', 'b', 'c', 'd', 'e'], 2)).toEqual([
      ['a', 'c', 'e'],
      ['b', 'd']
    ])
  })

  it('keeps a single lane when only one key is available', () => {
    expect(partitionByKey(['a', 'b'], 1)).toEqual([['a', 'b']])
    expect(partitionByKey([], 2)).toEqual([[], []])
  })
})
