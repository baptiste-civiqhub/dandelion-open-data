// Mesure reproductible de la fleur : `pnpm bench:flower` (ou node --experimental-strip-types --import ./scripts/benchmark/register.mjs scripts/benchmark/flower-benchmark.ts [out.json]).
// Jeu RÉEL : fixture de l'équipe (392 amendements). Jeux SYNTHÉTIQUES générés en mémoire (1k, 10k, 100k), jamais committés.
import { readFileSync, writeFileSync } from 'node:fs'
import { performance } from 'node:perf_hooks'

import type { DandelionNode, TexteSnapshot } from '../../apis/texte/types'
import { buildTree } from '../../features/texte/lib/build-tree'
import { FOCUS_SHARE, MAX_VISIBLE } from '../../features/texte/lib/constants'
import { cutTree } from '../../features/texte/lib/cut-tree'
import { layoutRadial } from '../../features/texte/lib/layout-radial'
import { syntheticSnapshot } from '../../features/texte/lib/synthetic'
import { indexTree, resolveNodeId } from '../../features/texte/lib/tree-index'

const RADIUS = 320
const median = (values: number[]) => {
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 ? (sorted[mid] as number) : ((sorted[mid - 1] as number) + (sorted[mid] as number)) / 2
}
const time = <T>(fn: () => T, runs: number) => {
  const samples: number[] = []
  let result = fn()
  for (let i = 0; i < runs; i += 1) {
    const start = performance.now()
    result = fn()
    samples.push(performance.now() - start)
  }
  return { result, medianMs: Math.round(median(samples) * 1000) / 1000, runs }
}
const count = (node: DandelionNode): number => {
  let total = 0
  const stack = [node]
  while (stack.length) {
    const current = stack.pop() as DandelionNode
    total += 1
    stack.push(...current.children)
  }
  return total
}

const measure = (label: string, kind: 'real' | 'synthetic', snapshot: TexteSnapshot) => {
  const runs = snapshot.amendments.length >= 100_000 ? 5 : snapshot.amendments.length >= 10_000 ? 9 : 21
  const build = time(() => buildTree(snapshot), runs)
  const tree = build.result
  const index = indexTree(tree)
  const last = snapshot.amendments.at(-1)
  const focusId = last ? resolveNodeId(index, last.id) : null
  const rest = time(() => cutTree(tree, { focusId: null, budget: MAX_VISIBLE, outerRadiusPx: RADIUS }), runs)
  const focus = time(() => cutTree(tree, { focusId, budget: MAX_VISIBLE, outerRadiusPx: RADIUS }), runs)
  const layout = time(
    () => layoutRadial(focus.result, { focusId, focusShare: FOCUS_SHARE, outerRadiusPx: RADIUS }),
    runs
  )
  const visibleIds = new Set(layout.result.map((node) => node.id))
  return {
    label,
    kind,
    records: snapshot.amendments.length,
    treeNodes: count(tree),
    totalWeight: tree.weight,
    buildMedianMs: build.medianMs,
    cutRestMedianMs: rest.medianMs,
    cutFocusMedianMs: focus.medianMs,
    layoutMedianMs: layout.medianMs,
    interactionMedianMs: Math.round((focus.medianMs + layout.medianMs) * 1000) / 1000,
    visibleAtRest: count(rest.result),
    visibleFocused: layout.result.length,
    focusRevealed: focusId ? visibleIds.has(focusId) : false,
    weightPreserved: focus.result.weight === tree.weight && rest.result.weight === tree.weight,
    runs
  }
}

const team = JSON.parse(
  readFileSync(new URL('../../features/texte/fixtures/texte-amendements.json', import.meta.url), 'utf8')
)
const sizes = (process.env.BENCH_SIZES ?? '1000,10000,100000').split(',').map(Number)
const results = [
  measure('police-municipale-an-2464', 'real', team as TexteSnapshot),
  ...sizes.map((size) => measure(`synthetic-${size}`, 'synthetic', syntheticSnapshot(size))),
  ...sizes
    .filter((size) => size <= 10_000)
    .map((size) => measure(`synthetic-${size}-heavy-branch`, 'synthetic', syntheticSnapshot(size, { heavyShare: 0.9 })))
]
const report = { node: process.version, budget: MAX_VISIBLE, outerRadiusPx: RADIUS, results }
const out = process.argv[2]
if (out) writeFileSync(out, `${JSON.stringify(report, null, 2)}\n`)
console.log(JSON.stringify(report, null, 2))
