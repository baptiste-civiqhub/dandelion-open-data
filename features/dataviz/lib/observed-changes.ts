import type { AmendementSummary } from '@/apis/amendements/types'
import type { Article } from '@/apis/articles/types'
import { safeDocumentUrl } from './area-flower'

type Examination = { startsOn: string; stage: string; sourceUrl: string; scopeVerified: boolean }
type ObservationContext = { texteUid: string; asOf: string; examination?: Examination }
export type ObservedChange = {
  kind: 'observed_change'
  subject: { texte_uid: string; article_uid: string; article_id: string; label: string; placement: string }
  as_of: string
  observation: {
    rule: 'amendements_deposes_avant_examen' | 'amendements_dates_dans_corpus'
    amendements_deposes: number
    dont_gouvernement: number
    amendements_charges: number
    dates_manquantes_ou_invalides: number
    dates_hors_perimetre: number
    auteurs_non_renseignes: number
    sources_manquantes: number
    date_debut_examen: string | null
    etape_examen: string | null
    source_examen: string | null
  }
  records: { id: string; numero: string; date: string; government: boolean; sourceUrl: string | null }[]
  source_urls: string[]
  coverage: 'etape_verifiee' | 'corpus_charge_etapes_non_separees'
  method_version: 'regle-v1-2026-11-14'
  limitations: (
    | 'depot_pas_modification'
    | 'date_examen_ou_etape_non_verifiee'
    | 'dates_absentes'
    | 'sources_absentes'
  )[]
}

function calendarDay(value: string | null | undefined): string | null {
  if (!value || !/^\d{4}-\d{2}-\d{2}(?:$|T)/.test(value)) return null
  const day = value.slice(0, 10)
  const time = Date.parse(day + 'T00:00:00Z')
  return Number.isFinite(time) && new Date(time).toISOString().slice(0, 10) === day ? day : null
}

export function buildObservedChanges(
  articles: Article[],
  amendments: AmendementSummary[],
  context: ObservationContext
): ObservedChange[] {
  const asOfDay = calendarDay(context.asOf)
  if (!asOfDay || !Number.isFinite(Date.parse(context.asOf))) throw new Error('Invalid observation timestamp')
  const exam = context.examination
  const examDay = calendarDay(exam?.startsOn)
  const examUrl = safeDocumentUrl(exam?.sourceUrl)
  const verified = !!(exam?.scopeVerified && examDay && examUrl && exam.stage.trim())
  const groups = new Map<string, AmendementSummary[]>()
  const seen = new Set<string>()
  for (const a of amendments) {
    if (seen.has(a.id)) continue
    seen.add(a.id)
    const placement = ['A', 'AVANT', 'APRES'].includes(a.divisionAvantApres) ? a.divisionAvantApres : 'AUTRE'
    const key = `${a.articleId}:${placement}`
    const group = groups.get(key) ?? []
    group.push(a)
    groups.set(key, group)
  }
  return articles.flatMap((article) =>
    ['A', 'AVANT', 'APRES', 'AUTRE'].flatMap((placement) => {
      const rows = groups.get(`${article.id}:${placement}`) ?? []
      if (placement !== 'A' && rows.length === 0) return []
      let missing = 0,
        outside = 0
      const included = rows.flatMap((a) => {
        const day = calendarDay(a.dateDepot)
        if (!day) {
          missing++
          return []
        }
        if (day > asOfDay || (verified && day >= (examDay as string))) {
          outside++
          return []
        }
        return [{ row: a, day }]
      })
      const records = included.map(({ row, day }) => ({
        id: row.id,
        numero: row.numeroLong,
        date: day,
        government: row.typeAuteur?.trim().toLowerCase() === 'gouvernement',
        sourceUrl: safeDocumentUrl(row.sourceUrl)
      }))
      const missingSources = records.filter((r) => !r.sourceUrl).length
      const limitations: ObservedChange['limitations'] = ['depot_pas_modification']
      if (!verified) limitations.push('date_examen_ou_etape_non_verifiee')
      if (missing) limitations.push('dates_absentes')
      if (missingSources) limitations.push('sources_absentes')
      return [
        {
          kind: 'observed_change' as const,
          subject: {
            texte_uid: context.texteUid,
            article_uid: `${context.texteUid}:${article.id}`,
            article_id: article.id,
            label: article.designation,
            placement
          },
          as_of: context.asOf,
          observation: {
            rule: verified ? ('amendements_deposes_avant_examen' as const) : ('amendements_dates_dans_corpus' as const),
            amendements_deposes: records.length,
            dont_gouvernement: records.filter((r) => r.government).length,
            amendements_charges: rows.length,
            dates_manquantes_ou_invalides: missing,
            dates_hors_perimetre: outside,
            auteurs_non_renseignes: included.filter((a) => !a.row.typeAuteur?.trim()).length,
            sources_manquantes: missingSources,
            date_debut_examen: verified ? examDay : null,
            etape_examen: verified ? (exam?.stage ?? null) : null,
            source_examen: verified ? examUrl : null
          },
          records,
          source_urls: [...new Set(records.flatMap((r) => (r.sourceUrl ? [r.sourceUrl] : [])))],
          coverage: verified ? ('etape_verifiee' as const) : ('corpus_charge_etapes_non_separees' as const),
          method_version: 'regle-v1-2026-11-14' as const,
          limitations
        }
      ]
    })
  )
}
