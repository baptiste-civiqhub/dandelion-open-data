'use client'

import { useTranslations } from 'next-intl'

import type { Intention, NodeKind } from '@/apis/texte/types'

const INTENTIONS: readonly Intention[] = ['supprimer', 'reecrire', 'ajouter', 'modifier', 'autre']

export const isIntention = (label: string): label is Intention => (INTENTIONS as readonly string[]).includes(label)

/** Libellé lisible d'un nœud de la fleur (partagé par la fleur et le fil d'Ariane). */
export function useNodeLabel() {
  const t = useTranslations('texte')
  return (node: { kind: NodeKind; label: string }): string => {
    if (node.kind === 'intention' && isIntention(node.label)) return t(`intentions.${node.label}`)
    if (node.kind === 'reste') return t('reste')
    if (node.kind === 'discussion' && node.label === '') return t('sansDiscussion')
    if (node.kind === 'doublon' && node.label === '') return t('sansDoublon')
    return node.label
  }
}
