import { useTranslations } from 'next-intl'

import { Stage } from '@/components/shared/stage'
import { Widget, WidgetContent, WidgetDescription, WidgetHeader, WidgetTitle } from '@/components/shared/widget'

import { DatavizCanvas } from './dataviz-canvas'

/**
 * Gabarit d'une page de dataviz : le graphique occupe le canvas de fond, la colonne gauche décrit le jeu de données,
 * la colonne droite porte les réglages de la vue (filtres, légende). Colonne centrale vide : on voit et on manipule
 * le graphique. Les widgets afficheront les quatre états (chargement, vide, erreur, rempli) une fois `apis/datasets/`
 * branché ; aujourd'hui ils montrent l'état « source non connectée ».
 */
export function DatavizScreen({ datasetId }: { datasetId: string }) {
  const t = useTranslations('dataviz')

  return (
    <Stage
      canvas={<DatavizCanvas datasetId={datasetId} label={t('canvasLabel', { datasetId })} />}
      left={
        <Widget aria-labelledby='dataviz-dataset-title'>
          <WidgetHeader>
            <WidgetTitle id='dataviz-dataset-title'>{datasetId}</WidgetTitle>
            <WidgetDescription>{t('dataset.eyebrow')}</WidgetDescription>
          </WidgetHeader>
          <WidgetContent>
            <p className='text-muted-foreground'>{t('dataset.notConnected')}</p>
          </WidgetContent>
        </Widget>
      }
      right={
        <Widget aria-labelledby='dataviz-view-title'>
          <WidgetHeader>
            <WidgetTitle id='dataviz-view-title'>{t('view.title')}</WidgetTitle>
            <WidgetDescription>{t('view.description')}</WidgetDescription>
          </WidgetHeader>
        </Widget>
      }
    />
  )
}
