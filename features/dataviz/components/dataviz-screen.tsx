'use client'

import { useSearchParams } from 'next/navigation'
import { GuidedAreaScreen } from './guided-area-screen'
import { SunburstAreaScreen } from './sunburst-area-screen'

export function DatavizScreen({ areaId }: { areaId: string }) {
  const params = useSearchParams()
  return params.get('vue') === 'pissenlit' ? (
    <SunburstAreaScreen areaId={areaId} />
  ) : (
    <GuidedAreaScreen areaId={areaId} />
  )
}
