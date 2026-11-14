import type { Amendment, DandelionNode, TexteSnapshot } from '@/apis/texte/types'

import { classifyIntention } from './classify-intention'

const isBlank = (value: string | null): boolean => value === null || value === ''

const weightOf = (nodes: DandelionNode[]): number => nodes.reduce((sum, node) => sum + node.weight, 0)

const canNest = (amendment: Amendment, byId: Map<string, Amendment>): boolean => {
  if (!amendment.parentId || amendment.parentId === amendment.id || !byId.has(amendment.parentId)) return false
  const seen = new Set<string>([amendment.id])
  let cursor = amendment.parentId
  while (true) {
    if (seen.has(cursor)) return false
    seen.add(cursor)
    const parent = byId.get(cursor)
    if (!parent) return false
    if (!parent.parentId || !byId.has(parent.parentId)) return true
    cursor = parent.parentId
  }
}

const firstSeen = (items: Amendment[], keyOf: (amendment: Amendment) => string): string[] => {
  const keys: string[] = []
  const seen = new Set<string>()
  for (const item of items) {
    const key = keyOf(item)
    if (seen.has(key)) continue
    seen.add(key)
    keys.push(key)
  }
  return keys
}

export const buildTree = (snapshot: TexteSnapshot, { groupOperations = true } = {}): DandelionNode => {
  const root: DandelionNode = {
    id: `texte:${snapshot.id}`,
    kind: 'texte',
    label: snapshot.titre,
    weight: snapshot.amendments.length,
    children: []
  }
  if (snapshot.amendments.length === 0) return root

  const byId = new Map<string, Amendment>()
  for (const amendment of snapshot.amendments) {
    if (!byId.has(amendment.id)) byId.set(amendment.id, amendment)
  }

  const childrenByParent = new Map<string, Amendment[]>()
  const tops: Amendment[] = []
  for (const amendment of snapshot.amendments) {
    if (!byId.has(amendment.id) || byId.get(amendment.id) !== amendment) continue
    if (canNest(amendment, byId)) {
      const parentId = amendment.parentId as string
      const list = childrenByParent.get(parentId) ?? []
      list.push(amendment)
      childrenByParent.set(parentId, list)
    } else {
      tops.push(amendment)
    }
  }

  const amendmentNodes = new Map<string, DandelionNode>()
  for (const amendment of byId.values()) {
    amendmentNodes.set(amendment.id, {
      id: `amendement:${amendment.id}`,
      kind: 'amendement',
      label: amendment.numero,
      weight: 1,
      children: [],
      amendmentId: amendment.id
    })
  }
  for (const [parentId, children] of childrenByParent) {
    const parent = amendmentNodes.get(parentId)
    if (parent) parent.children = children.map((child) => amendmentNodes.get(child.id)!)
  }
  // Calcul en post-ordre explicite : une chaîne profonde ne dépend pas de la taille de pile du moteur JS.
  const pending = tops.map((amendment) => ({ node: amendmentNodes.get(amendment.id)!, visited: false }))
  while (pending.length > 0) {
    const entry = pending.pop()!
    if (entry.visited) entry.node.weight = 1 + weightOf(entry.node.children)
    else {
      pending.push({ node: entry.node, visited: true })
      for (const child of entry.node.children) pending.push({ node: child, visited: false })
    }
  }
  const amendmentNode = (amendment: Amendment): DandelionNode => amendmentNodes.get(amendment.id)!

  const buildDoublonOrLeaves = (parentId: string, items: Amendment[]): DandelionNode[] => {
    if (!items.some((item) => !isBlank(item.discussionIdentique))) return items.map(amendmentNode)
    return firstSeen(items, (item) => item.discussionIdentique ?? '').map((value) => {
      const group = items.filter((item) => (item.discussionIdentique ?? '') === value)
      const children = group.map(amendmentNode)
      return {
        id: `${parentId}/doublon:${value}`,
        kind: 'doublon',
        label: value,
        weight: weightOf(children),
        children
      }
    })
  }

  const buildDiscussionOrNext = (parentId: string, items: Amendment[]): DandelionNode[] => {
    if (!items.some((item) => !isBlank(item.discussionCommune))) return buildDoublonOrLeaves(parentId, items)
    return firstSeen(items, (item) => item.discussionCommune ?? '').map((value) => {
      const group = items.filter((item) => (item.discussionCommune ?? '') === value)
      const id = `${parentId}/discussion:${value}`
      const children = buildDoublonOrLeaves(id, group)
      return {
        id,
        kind: 'discussion',
        label: value,
        weight: weightOf(children),
        children
      }
    })
  }

  const articles = firstSeen(tops, (item) => item.article)
  root.children = articles.map((article) => {
    const inArticle = tops.filter((item) => item.article === article)
    const id = `article:${article}`
    if (!groupOperations) {
      const children = buildDiscussionOrNext(id, inArticle)
      return { id, kind: 'article' as const, label: article, weight: weightOf(children), children }
    }
    const intentions = firstSeen(inArticle, (item) => classifyIntention(item.dispositif))
    const children = intentions.map((intention) => {
      const group = inArticle.filter((item) => classifyIntention(item.dispositif) === intention)
      const intentionId = `${id}/intention:${intention}`
      const intentionChildren = buildDiscussionOrNext(intentionId, group)
      return {
        id: intentionId,
        kind: 'intention' as const,
        label: intention,
        weight: weightOf(intentionChildren),
        children: intentionChildren
      }
    })
    return {
      id,
      kind: 'article' as const,
      label: article,
      weight: weightOf(children),
      children
    }
  })

  return root
}
