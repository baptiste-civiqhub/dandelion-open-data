'use client'

import { ChevronDown, ChevronRight, CornerDownRight } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useState } from 'react'

import type { PfasTreeGroup, PfasTreeNode } from '@/features/pfas-amendments/lib/hierarchy'
import { cn } from '@/lib/utils'

import { OutcomeBadge } from './outcome-badge'

type AmendmentTreeProps = {
  groups: PfasTreeGroup[]
  initiallyOpen: string[]
  focusedId: string | null
  selectedIds: string[]
  onFocus: (id: string) => void
  onToggleSelect: (id: string) => void
}

export function AmendmentTree({
  groups,
  initiallyOpen,
  focusedId,
  selectedIds,
  onFocus,
  onToggleSelect
}: AmendmentTreeProps) {
  const t = useTranslations('pfasExperiment.explorer')
  const [open, setOpen] = useState(() => new Set(initiallyOpen))
  const selectionFull = selectedIds.length >= 2

  const toggleGroup = (subdivision: string) =>
    setOpen((current) => {
      const next = new Set(current)
      if (next.has(subdivision)) next.delete(subdivision)
      else next.add(subdivision)
      return next
    })

  const renderNode = (node: PfasTreeNode, depth: number) => {
    const { amendment } = node
    const checked = selectedIds.includes(amendment.id)
    const focused = focusedId === amendment.id
    const checkboxId = `pfas-select-${amendment.id}`
    return (
      <li key={amendment.id} className={cn(depth > 0 && 'border-border ml-4 border-l pl-3')}>
        <div
          data-testid={`pfas-row-${amendment.number}`}
          className={cn(
            'flex flex-wrap items-center gap-2 rounded-md border px-2 py-1.5',
            focused ? 'border-primary bg-accent' : 'border-transparent'
          )}
        >
          <input
            id={checkboxId}
            type='checkbox'
            className='accent-primary size-4'
            checked={checked}
            disabled={!checked && selectionFull}
            onChange={() => onToggleSelect(amendment.id)}
          />
          <label htmlFor={checkboxId} className='sr-only'>
            {t('compare', { number: amendment.numberLabel })}
          </label>
          <button
            type='button'
            aria-pressed={focused}
            onClick={() => onFocus(amendment.id)}
            className='focus-visible:ring-ring/50 flex min-w-0 flex-1 flex-wrap items-center gap-2 rounded-sm text-left text-sm outline-none focus-visible:ring-3'
          >
            {depth > 0 && <CornerDownRight aria-hidden='true' className='text-muted-foreground size-4' />}
            <span className='font-medium'>{t('amendmentNumber', { number: amendment.numberLabel })}</span>
            {node.missingParent && <span className='text-muted-foreground text-xs'>{t('missingParent')}</span>}
            {amendment.parentRelation && (
              <span className='text-foreground-secondary text-xs'>
                {t('subAmendmentOf', { number: amendment.parentRelation.parentNumber })}
              </span>
            )}
            {amendment.paragraph && (
              <span className='text-muted-foreground text-xs'>{t('paragraph', { value: amendment.paragraph })}</span>
            )}
          </button>
          <OutcomeBadge outcome={amendment.outcomeRaw} />
        </div>
        {node.children.length > 0 && (
          <ul className='mt-1 flex flex-col gap-1'>{node.children.map((c) => renderNode(c, depth + 1))}</ul>
        )}
      </li>
    )
  }

  return (
    <ul className='flex flex-col gap-2' aria-label={t('treeLabel')}>
      {groups.map((group) => {
        const expanded = open.has(group.subdivision)
        const panelId = `pfas-group-${group.subdivision.replace(/\W+/g, '-')}`
        return (
          <li key={group.subdivision} className='rounded-lg border'>
            <button
              type='button'
              aria-expanded={expanded}
              aria-controls={panelId}
              onClick={() => toggleGroup(group.subdivision)}
              className='hover:bg-accent focus-visible:ring-ring/50 flex w-full flex-wrap items-center gap-2 rounded-lg px-3 py-2 text-left outline-none focus-visible:ring-3'
            >
              {expanded ? (
                <ChevronDown aria-hidden='true' className='size-4' />
              ) : (
                <ChevronRight aria-hidden='true' className='size-4' />
              )}
              <span lang='fr' className='text-sm font-semibold'>
                {group.subdivision}
              </span>
              {group.placement.kind === 'additional-article' && (
                <span className='text-foreground-secondary text-xs'>
                  {t(group.placement.position === 'before' ? 'additionalBefore' : 'additionalAfter', {
                    article: group.placement.article ?? ''
                  })}
                </span>
              )}
              <span className='text-muted-foreground ml-auto text-xs'>{t('groupCount', { count: group.total })}</span>
            </button>
            {expanded && (
              <ul id={panelId} className='flex flex-col gap-1 px-2 pb-2'>
                {group.nodes.map((node) => renderNode(node, 0))}
              </ul>
            )}
          </li>
        )
      })}
    </ul>
  )
}
