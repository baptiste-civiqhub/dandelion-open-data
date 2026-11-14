'use client'

import { useTranslations } from 'next-intl'
import { useEffect, useMemo, useRef, useState } from 'react'

import { useGetTexteAmendements } from '@/apis/texte'
import { Skeleton } from '@/components/ui/skeleton'
import { buildTree } from '@/features/texte/lib/build-tree'
import { FOCUS_SHARE, MAX_VISIBLE } from '@/features/texte/lib/constants'
import { cutTree } from '@/features/texte/lib/cut-tree'
import { layoutRadial } from '@/features/texte/lib/layout-radial'

import { AmendmentCard } from './amendment-card'
import { DandelionFlower } from './dandelion-flower'

export function TexteScreen() {
  const t = useTranslations('texte')
  const frameRef = useRef<HTMLDivElement>(null)
  const [size, setSize] = useState({ width: 0, height: 0 })
  const [pinnedId, setPinnedId] = useState<string | null>(null)
  const [hoveredId, setHoveredId] = useState<string | null>(null)
  const [openAmendmentId, setOpenAmendmentId] = useState<string | null>(null)
  const { data, isPending, isError } = useGetTexteAmendements()
  const focusId = pinnedId ?? hoveredId
  const outerRadiusPx = Math.max(1, 0.4 * Math.min(size.width, size.height))

  useEffect(() => {
    const frame = frameRef.current
    if (!frame) return
    const observer = new ResizeObserver(([entry]) => {
      if (!entry) return
      setSize({ width: entry.contentRect.width, height: entry.contentRect.height })
    })
    observer.observe(frame)
    return () => observer.disconnect()
  }, [])

  const tree = useMemo(() => (data ? buildTree(data) : null), [data])
  const visible = useMemo(
    () => (tree && size.width > 0 ? cutTree(tree, { focusId, budget: MAX_VISIBLE, outerRadiusPx }) : null),
    [tree, focusId, outerRadiusPx, size.width]
  )
  const layout = useMemo(
    () => (visible ? layoutRadial(visible, { focusId, focusShare: FOCUS_SHARE, outerRadiusPx }) : []),
    [visible, focusId, outerRadiusPx]
  )
  const amendment = data?.amendments.find((item) => item.id === openAmendmentId) ?? null

  const onSelect = (id: string) => {
    const node = layout.find((item) => item.id === id)
    setPinnedId(id)
    if (node?.kind === 'amendement' && node.amendmentId) setOpenAmendmentId(node.amendmentId)
  }

  const onBackground = () => {
    if (openAmendmentId) {
      setOpenAmendmentId(null)
      return
    }
    setPinnedId(null)
  }

  return (
    <main className='mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-6 px-6 py-8'>
      <header className='flex flex-col gap-2'>
        <p className='text-muted-foreground text-sm font-medium tracking-wide uppercase'>{t('title')}</p>
        <h1 className='text-3xl font-bold tracking-tight'>{data?.titre ?? t('metaTitle')}</h1>
        {data ? <p className='sr-only'>{t('summary', { title: data.titre, count: data.amendments.length })}</p> : null}
      </header>

      {isError ? <p className='text-destructive'>{t('error')}</p> : null}
      {data && data.amendments.length === 0 ? <p className='text-muted-foreground'>{t('empty')}</p> : null}

      <div className='flex min-h-0 flex-1 flex-col gap-6 lg:flex-row'>
        <div ref={frameRef} className='bg-card relative min-h-[70vh] flex-1 overflow-hidden rounded-xl border'>
          {isPending ? <Skeleton className='absolute inset-0 rounded-none' /> : null}
          {data && data.amendments.length > 0 && size.width > 0 ? (
            <DandelionFlower
              nodes={layout}
              width={size.width}
              height={size.height}
              outerRadiusPx={outerRadiusPx}
              focusId={focusId}
              onHover={setHoveredId}
              onSelect={onSelect}
              onBackground={onBackground}
            />
          ) : null}
        </div>
        {amendment ? <AmendmentCard amendment={amendment} onClose={() => setOpenAmendmentId(null)} /> : null}
      </div>
    </main>
  )
}
