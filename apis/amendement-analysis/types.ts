/** `single` : lecture d'un amendement ; `compare` : le premier identifiant comparé au second. */
export type AmendementAnalysisMode = 'single' | 'compare'

export type AmendementAnalysisLocale = 'en' | 'fr'

export type AmendementAnalysisRequest = {
  mode: AmendementAnalysisMode
  amendementIds: string[]
  /** Langue des phrases rédigées par le modèle. */
  locale: AmendementAnalysisLocale
}

/** Faits lus dans l'enregistrement officiel, jamais dans la réponse du modèle. */
export type AnalysisSource = {
  id: string
  numeroLong: string
  sort: string
  articleDesignation: string | null
  dispositifWords: number
  exposeWords: number
}

/** Recouvrement lexical calculé sans modèle (mots distincts partagés, indice de Jaccard). */
export type TextOverlap = {
  similarity: number
  sharedWords: number
  onlyInFirst: number
  onlyInSecond: number
  isIdentical: boolean
}

export type AnalysisOverlap = { dispositif: TextOverlap | null; expose: TextOverlap | null }

/** Effet recherché par l'amendement, selon le modèle : supprimer, réécrire, insérer, préciser, demander un rapport. */
export type AmendementIntent = 'delete' | 'rewrite' | 'insert' | 'clarify' | 'report' | 'other'

/** Lien de fond entre deux amendements, selon le modèle. */
export type ComparisonRelation = 'identical' | 'convergent' | 'complementary' | 'divergent' | 'unrelated'

export type SingleAnalysis = {
  kind: 'single'
  summary: string
  intent: AmendementIntent
  keyPoints: string[]
  themes: string[]
}

export type ComparisonAnalysis = {
  kind: 'compare'
  summary: string
  relation: ComparisonRelation
  similarities: string[]
  differences: string[]
}

export type AmendementAnalysis = SingleAnalysis | ComparisonAnalysis

export type AnalysisDegradedReason = 'unconfigured' | 'timeout' | 'provider-error' | 'invalid-response' | 'abstained'

/**
 * Réponse de `POST /api/amendements/analysis`. `inferred` : texte produit par un modèle (Featherless), à présenter
 * comme une inférence. `degraded` : pas d'inférence (clé absente, délai, refus…), seuls les faits calculés restent.
 */
export type AmendementAnalysisResponse =
  | {
      status: 'inferred'
      mode: AmendementAnalysisMode
      model: string
      generatedAt: string
      analysis: AmendementAnalysis
      sources: AnalysisSource[]
      overlap: AnalysisOverlap | null
    }
  | {
      status: 'degraded'
      mode: AmendementAnalysisMode
      reason: AnalysisDegradedReason
      model: string | null
      sources: AnalysisSource[]
      overlap: AnalysisOverlap | null
    }

export type AmendementAnalysisRejectionCode = 'invalid-request' | 'not-found' | 'source-error'

export type AmendementAnalysisRejection = { status: 'rejected'; code: AmendementAnalysisRejectionCode }
