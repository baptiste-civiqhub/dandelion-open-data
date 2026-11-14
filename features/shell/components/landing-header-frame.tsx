'use client'

import { useEffect, useState, type ReactNode } from 'react'

import { FloatingHeader } from '@/components/shared/floating-header'
import { PUBLIC_PATHS } from '@/constant/path'
import { usePathname } from '@/i18n/navigation'
import { isLandingHeaderParked } from '@/lib/landing-intro'
import { cn } from '@/lib/utils'
import { useLandingIntroStore } from '@/store/landing-intro'

type LandingHeaderFrameProps = {
  children: ReactNode
}

/**
 * Coque du header flottant : hors écran tant que le rideau de la landing n'est pas levé.
 * La descente ne se joue qu'au moment où il quitte cette place (pas à chaque page).
 * `inert` le retire du tab et des lecteurs d'écran pendant qu'il est garé.
 */
export function LandingHeaderFrame({ children }: LandingHeaderFrameProps) {
  const pathname = usePathname()
  const phase = useLandingIntroStore((state) => state.phase)
  const parked = isLandingHeaderParked(pathname === PUBLIC_PATHS.HOME, phase)
  const [hasBeenParked, setHasBeenParked] = useState(false)
  const descend = !parked && hasBeenParked

  useEffect(() => {
    if (parked) setHasBeenParked(true)
  }, [parked])

  return (
    <FloatingHeader
      inert={parked || undefined}
      aria-hidden={parked || undefined}
      className={cn(
        parked ? 'landing-header-parked' : 'landing-header-rest',
        descend && 'motion-safe:animate-landing-header'
      )}
    >
      {children}
    </FloatingHeader>
  )
}
