'use client'

import { CosmographCanvas } from './cosmograph-canvas'
import { PfasScreen } from './pfas-screen'

export function CosmographPfasScreen() {
  return <PfasScreen Canvas={CosmographCanvas} engine='cosmograph' />
}
