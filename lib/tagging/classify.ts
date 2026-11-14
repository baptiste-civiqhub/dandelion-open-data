export const NOUL_THRESHOLD = 0.5

export const QUESTION_WAVE_SIZE = 50

// Un article long plus cinquante règles tient encore dans le contexte des classifieurs Featherless.
export const DISPOSITIF_CHARACTER_BUDGET = 8_000

// Qwen3.5-4B et Qwen3.6-35B répondent 503. RWKV-small reste sous 0.35 sur un article budgétaire.
export const DEFAULT_CLASSIFIER_MODEL = 'featherless-ai/gemma-4-12B-it-classifier'

const QUESTION_INSTRUCTIONS = "Ce sujet s'applique-t-il à cet article de loi ?"

const NEGATIVE_CRITERION = "L'article ne porte pas sur ce sujet."

export type TagDefinition = {
  slug: string
  label: string
  category: string
  rule: string
}

export type ArticleToClassify = {
  designation: string | null
  title: string | null
  dispositif: string | null
}

export type NoulQuestion = {
  type: 'noul'
  instructions: string
  criteria: {
    true: string
    false: string
  }
}

export type ClassifierRequestBody = {
  model: string
  state: {
    designation: string | null
    titre: string | null
    dispositif: string | null
  }
  questions: Record<string, NoulQuestion>
}

export type ScoredTag = {
  slug: string
  confidence: number | null
}

export type ArticleTagSet = {
  tags: readonly ScoredTag[]
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

export const truncateDispositif = (dispositif: string | null, budget = DISPOSITIF_CHARACTER_BUDGET): string | null => {
  if (dispositif === null) return null
  if (budget <= 0) return ''
  if (dispositif.length <= budget) return dispositif
  return dispositif.slice(0, budget)
}

export const splitVocabulary = <T>(items: readonly T[], waveSize = QUESTION_WAVE_SIZE): T[][] => {
  if (waveSize < 1 || items.length === 0) return []
  const waves: T[][] = []
  for (let index = 0; index < items.length; index += waveSize) {
    waves.push(items.slice(index, index + waveSize))
  }
  return waves
}

export const buildClassifierRequest = (
  vocabulary: readonly TagDefinition[],
  article: ArticleToClassify,
  model: string,
  options: { truncateDispositif?: boolean } = {}
): ClassifierRequestBody => {
  const questions: Record<string, NoulQuestion> = {}
  for (const definition of vocabulary) {
    questions[definition.slug] = {
      type: 'noul',
      instructions: QUESTION_INSTRUCTIONS,
      criteria: {
        true: definition.rule,
        false: NEGATIVE_CRITERION
      }
    }
  }

  return {
    model,
    state: {
      designation: article.designation,
      titre: article.title,
      dispositif: options.truncateDispositif ? truncateDispositif(article.dispositif) : article.dispositif
    },
    questions
  }
}

export const parseClassifierAnswers = (
  answers: unknown,
  vocabulary: readonly TagDefinition[],
  threshold = NOUL_THRESHOLD
): ScoredTag[] => {
  if (!isRecord(answers)) return []

  const allowed = new Set(vocabulary.map((definition) => definition.slug))
  const scored: ScoredTag[] = []

  for (const [slug, answer] of Object.entries(answers)) {
    if (!allowed.has(slug) || !isRecord(answer) || answer.type !== 'noul') continue
    const confidence = answer.noul
    if (typeof confidence !== 'number' || !Number.isFinite(confidence)) continue
    if (confidence < 0 || confidence > 1 || confidence < threshold) continue
    scored.push({ slug, confidence })
  }

  return scored
}

export const unionArticleTags = (articleSets: readonly ArticleTagSet[]): ScoredTag[] => {
  const best = new Map<string, number | null>()

  for (const articleSet of articleSets) {
    for (const tag of articleSet.tags) {
      const current = best.get(tag.slug)
      if (current === undefined) {
        best.set(tag.slug, tag.confidence)
        continue
      }
      if (tag.confidence === null) continue
      if (current === null || tag.confidence > current) best.set(tag.slug, tag.confidence)
    }
  }

  return [...best.entries()]
    .map(([slug, confidence]) => ({ slug, confidence }))
    .sort((left, right) => left.slug.localeCompare(right.slug))
}
