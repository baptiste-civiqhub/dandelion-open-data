'use client'

import { useId, useMemo, useState } from 'react'
import { SlidersHorizontal } from 'lucide-react'
import { useTranslations } from 'next-intl'

import { useGetAreas } from '@/apis/areas'
import { useGetTags } from '@/apis/tags'
import { FilterChip, FilterChipList } from '@/components/shared/filter-chip'
import { SearchInput } from '@/components/shared/search-input'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { PUBLIC_PATHS } from '@/constant/path'
import { Link } from '@/i18n/navigation'
import { cn } from '@/lib/utils'

import { countAreasByTag, filterAreas } from '../lib/filter-areas'
import { AreaCard } from './area-card'

type AreasBrowserProps = {
  /** Recherche de départ (page `/area?q=`). */
  initialQuery?: string
  /** Appelé quand l'utilisateur choisit une zone : la fenêtre du menu « Area » se referme. */
  onNavigate?: () => void
  className?: string
}

/**
 * Catalogue des zones, commun à la fenêtre du menu « Area » et à la page `/area` : recherche à la frappe, bouton de
 * filtres, pastilles de tags en défilement horizontal (toutes visibles quand le bouton est ouvert), puis la liste.
 * Les tags viennent du backend ; seuls ceux portés par au moins une zone sont proposés.
 */
export function AreasBrowser({ initialQuery = '', onNavigate, className }: AreasBrowserProps) {
  const t = useTranslations('areas')
  const filtersId = useId()
  const areasQuery = useGetAreas()
  const tagsQuery = useGetTags()
  const [query, setQuery] = useState(initialQuery)
  const [tagIds, setTagIds] = useState<string[]>([])
  const [expanded, setExpanded] = useState(false)

  const areas = areasQuery.data
  const tags = tagsQuery.data

  const tagById = useMemo(() => new Map((tags ?? []).map((tag) => [tag.id, tag])), [tags])
  const counts = useMemo(() => countAreasByTag(areas ?? []), [areas])
  const usedTags = useMemo(() => (tags ?? []).filter((tag) => counts[tag.id]), [tags, counts])
  const visibleAreas = useMemo(
    () => filterAreas(areas ?? [], tags ?? [], { query, tagIds }),
    [areas, tags, query, tagIds]
  )

  const toggleTag = (tagId: string) =>
    setTagIds((current) => (current.includes(tagId) ? current.filter((id) => id !== tagId) : [...current, tagId]))
  const clearFilters = () => {
    setQuery('')
    setTagIds([])
  }
  const filtering = query.trim() !== '' || tagIds.length > 0

  return (
    <div data-slot='areas-browser' className={cn('flex min-h-0 flex-1 flex-col gap-3', className)}>
      <p className='text-muted-foreground text-sm'>
        <Link href={PUBLIC_PATHS.DATASETS} onClick={onNavigate} className='text-primary underline'>
          {t('archived')}
        </Link>
      </p>
      <div className='flex items-center gap-2'>
        <SearchInput
          className='flex-1'
          label={t('search.label')}
          placeholder={t('search.placeholder')}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
        <Button
          variant='secondary'
          size='sm'
          className='rounded-full'
          aria-expanded={expanded}
          aria-controls={filtersId}
          onClick={() => setExpanded((current) => !current)}
        >
          <SlidersHorizontal aria-hidden />
          {t('filters.toggle')}
          {tagIds.length > 0 ? (
            <>
              <Badge aria-hidden>{tagIds.length}</Badge>
              <span className='sr-only'>{t('filters.active', { count: tagIds.length })}</span>
            </>
          ) : null}
        </Button>
      </div>

      <div id={filtersId}>
        {tagsQuery.isPending ? (
          <div className='flex gap-2 p-1'>
            <Skeleton className='h-8 w-24 rounded-full' />
            <Skeleton className='h-8 w-32 rounded-full' />
            <Skeleton className='h-8 w-20 rounded-full' />
          </div>
        ) : tagsQuery.isError ? (
          <p role='alert' className='text-muted-foreground p-1 text-sm'>
            {t('filters.error')}
          </p>
        ) : usedTags.length > 0 ? (
          <FilterChipList label={t('filters.listLabel')} layout={expanded ? 'wrap' : 'scroll'}>
            {usedTags.map((tag) => (
              <FilterChip
                key={tag.id}
                selected={tagIds.includes(tag.id)}
                count={counts[tag.id]}
                onClick={() => toggleTag(tag.id)}
              >
                {tag.label}
              </FilterChip>
            ))}
          </FilterChipList>
        ) : null}
      </div>

      {areasQuery.isPending ? (
        <div className='flex flex-col gap-2'>
          <Skeleton className='h-24 rounded-xl' />
          <Skeleton className='h-24 rounded-xl' />
          <Skeleton className='h-24 rounded-xl' />
        </div>
      ) : areasQuery.isError ? (
        <p role='alert' className='text-muted-foreground text-sm'>
          {t('error')}
        </p>
      ) : (
        <>
          <div className='flex min-h-8 items-center justify-between gap-2'>
            <p aria-live='polite' className='text-muted-foreground text-xs'>
              {t('results', { count: visibleAreas.length })}
            </p>
            {filtering ? (
              <Button variant='ghost' size='sm' className='rounded-full' onClick={clearFilters}>
                {t('filters.clear')}
              </Button>
            ) : null}
          </div>
          {visibleAreas.length > 0 ? (
            <ul className='scrollbar-hidden -m-1 flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto p-1'>
              {visibleAreas.map((area) => (
                <li key={area.id}>
                  <AreaCard
                    area={area}
                    tags={area.tagIds.flatMap((tagId) => tagById.get(tagId) ?? [])}
                    onNavigate={onNavigate}
                  />
                </li>
              ))}
            </ul>
          ) : (
            <p className='text-muted-foreground text-sm'>{areas && areas.length > 0 ? t('noMatch') : t('empty')}</p>
          )}
        </>
      )}
    </div>
  )
}
