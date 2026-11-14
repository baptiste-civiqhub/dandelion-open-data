'use client'

import { useTranslations } from 'next-intl'
import { useMemo } from 'react'

import { useGetPfasSnapshot } from '@/apis/pfas-amendments'
import { useGetTexteAmendements } from '@/apis/texte'
import { Stage } from '@/components/shared/stage'
import { Skeleton } from '@/components/ui/skeleton'
import { pfasToFlowerDataset, teamToFlowerDataset, type FlowerDatasetId } from '@/features/texte/lib/datasets'

import { FlowerExplorer } from './flower-explorer'

function Pending({ error }: { error: boolean }) {
  const t = useTranslations('flower')
  return (
    <Stage>
      {error ? (
        <p role='alert' className='bg-background pointer-events-auto rounded-md border p-4'>
          {t('error')}
        </p>
      ) : (
        <Skeleton className='h-96 w-full' aria-label={t('loading')} />
      )}
    </Stage>
  )
}

function PfasFlower() {
  const { data, isError } = useGetPfasSnapshot()
  const dataset = useMemo(() => (data ? pfasToFlowerDataset(data) : null), [data])
  if (!data || !dataset) return <Pending error={isError} />
  return <FlowerExplorer dataset={dataset} pfas={data} />
}

function TeamFlower() {
  const { data, isError } = useGetTexteAmendements()
  const dataset = useMemo(() => (data ? teamToFlowerDataset(data) : null), [data])
  if (!dataset) return <Pending error={isError} />
  return <FlowerExplorer dataset={dataset} pfas={null} />
}

export function FlowerDatasetScreen({ datasetId }: { datasetId: FlowerDatasetId }) {
  return datasetId === 'pfas-senat-620' ? <PfasFlower /> : <TeamFlower />
}
