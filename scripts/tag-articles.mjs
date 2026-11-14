#!/usr/bin/env node
/**
 * Classe les articles publics avec Simple Jev, puis pose sur chaque texte
 * l'union des tags de ses articles.
 *
 *   pnpm tag:articles -- --texte PRJLANR5L17B3434
 *   pnpm tag:articles
 *
 * Deux comptes : FEATHERLESS_API_KEY_1 et FEATHERLESS_API_KEY_2.
 * FEATHERLESS_API_KEY seul reste la clé 1. SUPABASE_SECRET_KEY est requis.
 * Chaque clé a sa propre file, un appel à la fois : un 429 met cette file en pause.
 * FEATHERLESS_MODEL remplace le classifieur par défaut.
 */
import { existsSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import {
  buildClassifierRequest,
  DEFAULT_CLASSIFIER_MODEL,
  parseClassifierAnswers,
  QUESTION_WAVE_SIZE,
  splitVocabulary,
  unionArticleTags
} from '../lib/tagging/classify.ts'
import { OTHER_TAG, TAG_VOCABULARY, withOtherFallback } from '../lib/tagging/vocabulary.ts'

const CLASSIFIER_URL = 'https://api.featherless.ai/v1/classifier'
const SUPABASE_URL = 'https://mloaychfjhajdjfktcjp.supabase.co'
export const FEATHERLESS_KEY_COUNT = 2
export const IN_FLIGHT_PER_KEY = 1
const CLASSIFIER_ATTEMPTS = 8

export const classifierRetryDelayMs = (retryAfterHeader, attempt) => {
  const retryAfterSeconds = Number(retryAfterHeader)
  if (Number.isFinite(retryAfterSeconds) && retryAfterSeconds > 0) return retryAfterSeconds * 1000
  return Math.min(30_000, 1000 * 2 ** attempt)
}
const PAGE_SIZE = 1000

export const featherlessKeysFromEnv = (env) => {
  const keys = []
  const first = env.FEATHERLESS_API_KEY_1 || env.FEATHERLESS_API_KEY
  if (first) keys.push(first)
  const second = env.FEATHERLESS_API_KEY_2
  if (second && second !== first) keys.push(second)
  return keys.slice(0, FEATHERLESS_KEY_COUNT)
}

export const inferenceModelFilter = (model) => `&source=eq.inference&model=eq.${encodeURIComponent(model)}`

export const partitionByKey = (items, keyCount) => {
  const count = Math.max(1, keyCount)
  const lanes = Array.from({ length: count }, () => [])
  items.forEach((item, index) => {
    lanes[index % count].push(item)
  })
  return lanes
}

const loadEnvFile = (path) => {
  if (!existsSync(path)) return
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) continue
    const name = trimmed.slice(0, trimmed.indexOf('=')).trim()
    let value = trimmed.slice(trimmed.indexOf('=') + 1).trim()
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1)
    }
    if (process.env[name] === undefined) process.env[name] = value
  }
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

const readTexteUid = (argv) => {
  const index = argv.indexOf('--texte')
  if (index === -1) return null
  const uid = argv[index + 1]
  if (!uid || uid.startsWith('--')) throw new Error('uid de texte manquant après --texte')
  return uid
}

const createRest =
  (url, secret) =>
  async (path, { method = 'GET', body, prefer, range } = {}) => {
    const headers = {
      apikey: secret,
      Authorization: `Bearer ${secret}`,
      'Content-Type': 'application/json'
    }
    if (prefer) headers.Prefer = prefer
    if (range) headers.Range = range

    const response = await fetch(`${url}/rest/v1/${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(60_000)
    })
    const text = await response.text()
    if (!response.ok) {
      const error = new Error(`supabase ${method} ${path.split('?')[0]} ${response.status}`)
      error.status = response.status
      error.body = text.slice(0, 240)
      throw error
    }
    return text ? JSON.parse(text) : null
  }

const createClassifier = (apiKey) => {
  let blockedUntil = 0
  return async (body) => {
    let lastError = null
    for (let attempt = 1; attempt <= CLASSIFIER_ATTEMPTS; attempt += 1) {
      const pause = blockedUntil - Date.now()
      if (pause > 0) await sleep(pause)

      const response = await fetch(CLASSIFIER_URL, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(90_000)
      })
      const text = await response.text()
      if (response.ok) {
        const payload = text ? JSON.parse(text) : null
        if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
          throw new Error('réponse classifieur illisible')
        }
        return payload.answers
      }

      const error = new Error(`classifieur ${response.status}`)
      error.status = response.status
      error.body = text.slice(0, 240)
      lastError = error
      if (response.status !== 429 && response.status < 500) throw error
      const delay = classifierRetryDelayMs(response.headers.get('retry-after'), attempt)
      blockedUntil = Math.max(blockedUntil, Date.now() + delay)
    }
    throw lastError
  }
}

const scoreVocabulary = async (classify, article, vocabulary, model) => {
  const requestArticle = {
    designation: article.designation,
    title: article.titre,
    dispositif: article.dispositif
  }

  const scoreWave = async (tags) => {
    try {
      const answers = await classify(buildClassifierRequest(tags, requestArticle, model))
      return parseClassifierAnswers(answers, tags)
    } catch (error) {
      if (error.status !== 422) throw error
      if (tags.length > QUESTION_WAVE_SIZE) {
        const scored = []
        for (const wave of splitVocabulary(tags)) {
          scored.push(...(await scoreWave(wave)))
        }
        return scored
      }
      try {
        const answers = await classify(
          buildClassifierRequest(tags, requestArticle, model, { truncateDispositif: true })
        )
        return parseClassifierAnswers(answers, tags)
      } catch (retryError) {
        if (retryError.status !== 422) throw retryError
        const overflow = new Error(`contexte dépassé pour ${article.id}: ${retryError.body ?? retryError.message}`)
        overflow.status = 422
        throw overflow
      }
    }
  }

  return scoreWave(vocabulary)
}

const mapPool = async (items, concurrency, worker) => {
  if (items.length === 0) return
  let cursor = 0
  const runners = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (cursor < items.length) {
      const index = cursor
      cursor += 1
      await worker(items[index])
    }
  })
  await Promise.all(runners)
}

const listArticles = async (rest, texteId) => {
  const articles = []
  let from = 0
  for (;;) {
    const page = await rest(
      `articles?texte_id=eq.${texteId}&select=id,tag_list_id,dataset_id,designation,titre,dispositif,ordre&order=ordre.asc`,
      { range: `${from}-${from + PAGE_SIZE - 1}` }
    )
    const rows = Array.isArray(page) ? page : []
    articles.push(...rows)
    if (rows.length < PAGE_SIZE) return articles
    from += PAGE_SIZE
  }
}

const inFilter = (ids) => ids.map((id) => `"${id}"`).join(',')

const linksByList = async (rest, tagListIds, filters) => {
  if (tagListIds.length === 0) return []
  const rows = await rest(
    `tag_links?select=tag_list_id,tag_id,source,model,confidence&tag_list_id=in.(${inFilter(tagListIds)})${filters}`
  )
  return Array.isArray(rows) ? rows : []
}

const SEEDED_TAGS = [...TAG_VOCABULARY, OTHER_TAG]

const seedTags = async (rest) => {
  await rest('tags?on_conflict=slug', {
    method: 'POST',
    prefer: 'resolution=merge-duplicates,return=minimal',
    body: SEEDED_TAGS.map((definition) => ({
      slug: definition.slug,
      label: definition.label,
      category: definition.category,
      description: definition.rule
    }))
  })

  const rows = await rest(`tags?select=id,slug&slug=in.(${SEEDED_TAGS.map((definition) => definition.slug).join(',')})`)
  const bySlug = new Map()
  for (const row of Array.isArray(rows) ? rows : []) bySlug.set(row.slug, row.id)
  const missing = SEEDED_TAGS.filter((definition) => !bySlug.has(definition.slug)).map((definition) => definition.slug)
  if (missing.length > 0) throw new Error(`tags absents après amorçage : ${missing.join(', ')}`)
  return bySlug
}

const replaceTextTags = async (rest, texte, articleRows, tagIdBySlug) => {
  const articleListIds = articleRows.map((article) => article.tag_list_id)
  const links = await linksByList(rest, articleListIds, '')
  const slugById = new Map([...tagIdBySlug.entries()].map(([slug, id]) => [id, slug]))
  const perArticle = new Map(articleListIds.map((id) => [id, []]))

  for (const link of links) {
    const slug = slugById.get(link.tag_id)
    if (!slug) continue
    const bucket = perArticle.get(link.tag_list_id)
    if (!bucket) continue
    bucket.push({
      slug,
      confidence: typeof link.confidence === 'number' ? link.confidence : null
    })
  }

  const union = unionArticleTags([...perArticle.values()].map((tags) => ({ tags })))
  const manual = await linksByList(rest, [texte.tag_list_id], '&source=eq.manual')
  const manualTagIds = new Set(manual.map((link) => link.tag_id))

  await rest(`tag_links?tag_list_id=eq.${texte.tag_list_id}&source=eq.script`, { method: 'DELETE' })

  const rows = union
    .map((tag) => {
      const tagId = tagIdBySlug.get(tag.slug)
      if (!tagId || manualTagIds.has(tagId)) return null
      return {
        tag_list_id: texte.tag_list_id,
        tag_id: tagId,
        dataset_id: texte.dataset_id,
        target_type: 'texte',
        source: 'script',
        confidence: tag.confidence,
        model: null
      }
    })
    .filter((row) => row !== null)

  if (rows.length > 0) await rest('tag_links', { method: 'POST', prefer: 'return=minimal', body: rows })
  return rows.length
}

const classifyArticle = async (rest, classify, texte, article, model, tagIdBySlug, keyLabel, counts) => {
  try {
    const scored = withOtherFallback(await scoreVocabulary(classify, article, TAG_VOCABULARY, model))
    const occupied = await linksByList(rest, [article.tag_list_id], '')
    const occupiedTagIds = new Set(occupied.map((link) => link.tag_id))
    const rows = scored
      .map((tag) => {
        const tagId = tagIdBySlug.get(tag.slug)
        if (!tagId || occupiedTagIds.has(tagId)) return null
        return {
          tag_list_id: article.tag_list_id,
          tag_id: tagId,
          dataset_id: article.dataset_id,
          target_type: 'article',
          source: 'inference',
          confidence: tag.confidence,
          model
        }
      })
      .filter((row) => row !== null)

    if (rows.length === 0) {
      counts.empty += 1
      console.log(`${texte.uid} clé ${keyLabel} ${article.designation ?? article.id} : aucun tag`)
      return
    }

    await rest('tag_links', { method: 'POST', prefer: 'return=minimal', body: rows })
    counts.tagged += 1
    console.log(`${texte.uid} clé ${keyLabel} ${article.designation ?? article.id} : ${rows.length} tags`)
  } catch (error) {
    counts.failed += 1
    console.error(
      `${texte.uid} clé ${keyLabel} ${article.designation ?? article.id} : ${error.message}${error.body ? ` ${error.body}` : ''}`
    )
  }
}

const classifyTexte = async (rest, classifiers, texte, model, tagIdBySlug) => {
  const articles = await listArticles(rest, texte.id)
  const existing = await linksByList(
    rest,
    articles.map((article) => article.tag_list_id),
    inferenceModelFilter(model)
  )
  const alreadyTagged = new Set(existing.map((link) => link.tag_list_id))
  const counts = { tagged: 0, empty: 0, skipped: 0, failed: 0 }
  const pending = []

  for (const article of articles) {
    if (alreadyTagged.has(article.tag_list_id)) counts.skipped += 1
    else pending.push(article)
  }

  const lanes = partitionByKey(pending, classifiers.length)
  await Promise.all(
    lanes.map((lane, index) =>
      mapPool(lane, IN_FLIGHT_PER_KEY, (article) =>
        classifyArticle(rest, classifiers[index], texte, article, model, tagIdBySlug, index + 1, counts)
      )
    )
  )

  const textTags = await replaceTextTags(rest, texte, articles, tagIdBySlug)
  console.log(`${texte.uid} : union ${textTags}`)
  return counts
}

const main = async () => {
  const root = join(dirname(fileURLToPath(import.meta.url)), '..')
  loadEnvFile(join(root, '.env'))
  loadEnvFile(join(root, '.env.local'))

  const secret = process.env.SUPABASE_SECRET_KEY
  const apiKeys = featherlessKeysFromEnv(process.env)
  const model = process.env.FEATHERLESS_MODEL || DEFAULT_CLASSIFIER_MODEL
  if (!secret) throw new Error('SUPABASE_SECRET_KEY manquant')
  if (apiKeys.length === 0) throw new Error('FEATHERLESS_API_KEY_1 et FEATHERLESS_API_KEY_2 manquantes')

  const texteUid = readTexteUid(process.argv.slice(2))
  const url = (process.env.NEXT_PUBLIC_SUPABASE_URL || SUPABASE_URL).replace(/\/$/, '')
  const rest = createRest(url, secret)
  const classifiers = apiKeys.map((apiKey) => createClassifier(apiKey))
  console.log(
    `${apiKeys.length} clé${apiKeys.length > 1 ? 's' : ''} Featherless, ${IN_FLIGHT_PER_KEY} appel${IN_FLIGHT_PER_KEY > 1 ? 's' : ''} en vol sur chacune`
  )
  const tagIdBySlug = await seedTags(rest)

  const filter = texteUid ? `&uid=eq.${encodeURIComponent(texteUid)}` : ''
  const textes = await rest(`textes?select=id,uid,tag_list_id,dataset_id${filter}&order=uid.asc`)
  const rows = Array.isArray(textes) ? textes : []
  if (texteUid && rows.length === 0) throw new Error(`texte introuvable : ${texteUid}`)

  const totals = { tagged: 0, empty: 0, skipped: 0, failed: 0 }
  for (const texte of rows) {
    const counts = await classifyTexte(rest, classifiers, texte, model, tagIdBySlug)
    for (const key of Object.keys(totals)) totals[key] += counts[key]
  }

  console.log(
    `terminé : ${rows.length} textes, ${totals.tagged} articles tagués, ${totals.empty} sans tag, ${totals.skipped} déjà faits, ${totals.failed} en erreur`
  )
  if (totals.failed > 0) process.exitCode = 1
}

const isDirectRun = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]

if (isDirectRun) {
  main().catch((error) => {
    console.error(error.message)
    process.exitCode = 1
  })
}
