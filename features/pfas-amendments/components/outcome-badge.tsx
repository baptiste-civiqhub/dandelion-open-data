import { useTranslations } from 'next-intl'

import { Badge } from '@/components/ui/badge'
import { classifyOutcome, type PfasOutcomeKind } from '@/features/pfas-amendments/lib/outcome'

const VARIANT: Record<PfasOutcomeKind, 'success' | 'secondary' | 'warning' | 'info' | 'outline'> = {
  adopted: 'success',
  rejected: 'secondary',
  withdrawn: 'warning',
  inadmissible: 'info',
  fallen: 'outline',
  'not-moved': 'outline',
  none: 'outline',
  other: 'outline'
}

// Le libellé officiel (français) est toujours affiché tel quel : la couleur n'est qu'un repère secondaire.
export function OutcomeBadge({ outcome }: { outcome: string | null }) {
  const t = useTranslations('pfasExperiment.amendment')
  return (
    <Badge variant={VARIANT[classifyOutcome(outcome)]} lang={outcome ? 'fr' : undefined}>
      {outcome ?? t('noOutcome')}
    </Badge>
  )
}
