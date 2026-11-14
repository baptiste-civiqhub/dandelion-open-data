import snapshot from '@/features/texte/fixtures/texte-amendements.json'

import type { TexteSnapshot } from './types'

export const getTexteAmendements = (): Promise<TexteSnapshot> => Promise.resolve(snapshot as TexteSnapshot)
