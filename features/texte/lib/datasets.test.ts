import { describe, expect, it } from 'vitest'

import pfasSnapshot from '@/data/pfas/amendments.json'
import teamSnapshot from '@/features/texte/fixtures/texte-amendements.json'
import type { PfasSnapshot } from '@/apis/pfas-amendments/types'
import type { TexteSnapshot } from '@/apis/texte/types'

import { buildTree } from './build-tree'
import { datasetGaps, isFlowerDatasetId, pfasToFlowerDataset, teamToFlowerDataset } from './datasets'

const pfas = pfasSnapshot as PfasSnapshot
const team = teamSnapshot as TexteSnapshot

describe('pfasToFlowerDataset', () => {
  it('preserves every PFAS identifier, number and official source link', () => {
    const dataset = pfasToFlowerDataset(pfas)
    expect(dataset.snapshot.amendments).toHaveLength(32)
    pfas.amendments.forEach((item, index) => {
      const mapped = dataset.snapshot.amendments[index]
      expect(mapped?.id).toBe(item.id)
      expect(mapped?.numero).toBe(item.number)
      expect(mapped?.dispositif).toBe(item.proposalText)
      expect(mapped?.sort).toBe(item.outcomeRaw)
      expect(dataset.sourceUrls[item.id]).toBe(item.sourceUrl)
    })
    expect(dataset.provenance.sha256).toBe(pfas.provenance.sha256)
  })

  it('nests sub-amendment 32 under 14 in the flower tree using the recorded parent', () => {
    const dataset = pfasToFlowerDataset(pfas)
    const tree = buildTree(dataset.snapshot)
    const find = (node: typeof tree, id: string): typeof tree | null =>
      node.id === id ? node : (node.children.map((child) => find(child, id)).find(Boolean) ?? null)
    const parent = find(tree, 'amendement:senat-2023-2024-620-amdt-14')
    expect(parent?.children.map((child) => child.amendmentId)).toContain('senat-2023-2024-620-amdt-32')
    expect(tree.weight).toBe(32)
  })
})

describe('teamToFlowerDataset', () => {
  it('keeps the 392 municipal-police records and reports missing links and texts instead of inventing them', () => {
    const dataset = teamToFlowerDataset(team)
    const gaps = datasetGaps(dataset)
    expect(gaps.total).toBe(392)
    expect(gaps.missingUrl).toBe(392)
    expect(gaps.missingText).toBe(65)
    expect(Object.values(dataset.sourceUrls).every((url) => url === null)).toBe(true)
  })

  it('recognises only the registered dataset identifiers', () => {
    expect(isFlowerDatasetId('pfas-senat-620')).toBe(true)
    expect(isFlowerDatasetId('pfas')).toBe(false)
  })
})
