// Instantané public daté (Sénat, texte 620, 2023-2024), versionné dans data/pfas/ : aucune requête réseau ni base.
import snapshot from '@/data/pfas/amendments.json'

export const dynamic = 'force-static'

export function GET() {
  return Response.json(snapshot)
}
