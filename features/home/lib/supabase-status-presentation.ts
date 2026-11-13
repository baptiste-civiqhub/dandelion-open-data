import type { SupabaseStatus } from '@/apis/health/types'

export type StatusPresentation = {
  labelKey: 'up' | 'down' | 'unconfigured' | 'error'
  variant: 'success' | 'destructive' | 'secondary'
}

/** Sélecteur de présentation pur : statut de la sonde → clé i18n (namespace `status`) + variante de badge. */
export function supabaseStatusPresentation(status: SupabaseStatus | undefined): StatusPresentation {
  switch (status) {
    case 'up':
      return { labelKey: 'up', variant: 'success' }
    case 'down':
      return { labelKey: 'down', variant: 'destructive' }
    case 'unconfigured':
      return { labelKey: 'unconfigured', variant: 'secondary' }
    default:
      return { labelKey: 'error', variant: 'destructive' }
  }
}
