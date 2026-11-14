import type { Intention } from '@/apis/texte/types'

import { INTENTION_HEAD } from './constants'

const APOSTROPHES = /['’‘ʼ]/g
const COMBINING_MARKS = /[\u0300-\u036f]/g

const fold = (value: string): string =>
  value.normalize('NFD').replace(COMBINING_MARKS, '').replace(APOSTROPHES, "'").toLowerCase()

export const classifyIntention = (dispositif: string): Intention => {
  const head = fold(dispositif.slice(0, INTENTION_HEAD))
  if (head.includes('supprimer')) return 'supprimer'
  if (head.includes('rediger ainsi')) return 'reecrire'
  if (head.includes('completer') || head.includes('inserer') || head.includes("apres l'alinea")) return 'ajouter'
  if (head.includes('substituer') || head.includes('remplacer')) return 'modifier'
  return 'autre'
}
