import { readFile } from 'node:fs/promises'
import path from 'node:path'

// Contexte documentaire versionné (data/pfas/evidence-context.json), lu au build : aucune requête réseau ni base.
export const dynamic = 'force-static'

export async function GET() {
  try {
    const raw = await readFile(path.join(process.cwd(), 'data', 'pfas', 'evidence-context.json'), 'utf8')
    return Response.json(JSON.parse(raw))
  } catch (error) {
    const missing = (error as NodeJS.ErrnoException).code === 'ENOENT'
    return Response.json(
      { detail: missing ? 'Evidence context not available yet' : 'Evidence context unreadable' },
      { status: missing ? 404 : 500 }
    )
  }
}
