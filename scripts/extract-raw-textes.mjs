#!/usr/bin/env node
/**
 * Ferme les projets et propositions de loi déposés en 2026.
 * Les notices sont déjà dans raw. Le script attend que le corpus ait fini
 * les amendements de 2026, puis pagine les articles de chaque texte.
 * Il écrit un run « textes », jamais la file du corpus.
 *
 *   pnpm extract:textes
 *   pnpm extract:textes -- --run <uuid>
 */
import { existsSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

import {
  ACCOUNT_COUNT,
  IN_FLIGHT_PER_ACCOUNT,
  PAGE_SIZE,
  RATE_PER_ACCOUNT,
  keySlotsFromEnv,
  reserveToken,
  throughputPerMinute,
  workerCount
} from './extract-raw-corpus.mjs'

export const TARGET_YEAR = '2026'
export const AMENDMENT_YEAR_FLOOR = 1000
export const WAIT_MS = 20_000

const NOTICE_PREFIXES = ['PRJLANR5', 'PIONANR5', 'PNREANR5']

export const isAmendmentWindowReady = (counts, floor = AMENDMENT_YEAR_FLOOR) =>
  Number(counts?.[TARGET_YEAR] ?? 0) >= floor

export const queueHasYear = (queue, year) =>
  (queue ?? []).some((item) =>
    (item.filtres ?? []).some(
      (filtre) => filtre.colonne === 'date_depot' && String(filtre.valeur ?? '').startsWith(`${year}-`)
    )
  )

export const isCorpusSettled = (run, year = TARGET_YEAR) =>
  run?.status === 'done' && !queueHasYear(run?.state?.queue, year)

export const articleFiltres = (texteUid) => [{ colonne: 'texte_uid', op: 'eq', valeur: texteUid }]

export const isArticlePageClosed = (fetched, pageSize = PAGE_SIZE) => fetched < pageSize

export const noticeCandidates = (amendementUid) => {
  const legislature = String(amendementUid ?? '').match(/L1[4-7]/)?.[0]
  const bill = String(amendementUid ?? '').match(/B(\d+)P/)?.[1]
  if (!legislature || !bill) return []
  return NOTICE_PREFIXES.map((prefix) => `${prefix}${legislature}B${bill}`)
}

export const pendingTexteUids = (cohort, closed) => {
  const done = new Set(closed ?? [])
  return (cohort ?? []).filter((uid) => !done.has(uid))
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

const classify = (error) => {
  const body = String(error.body ?? '')
  const message = String(error.message ?? '')
  if (body.includes('402') || message.includes('402')) return 'credits'
  if (body.includes('429') || message.includes('429')) return 'rate'
  if ((error.status ?? 0) >= 500) return 'server'
  if (message === 'fetch failed' || /ECONNRESET|ETIMEDOUT|UND_ERR|TimeoutError|aborted|network/i.test(message))
    return 'server'
  return 'fatal'
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

const createClient = () => {
  const root = join(dirname(fileURLToPath(import.meta.url)), '..')
  loadEnvFile(join(root, '.env'))
  loadEnvFile(join(root, '.env.local'))

  const secret = process.env.SUPABASE_SECRET_KEY
  const url = (process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://mloaychfjhajdjfktcjp.supabase.co').replace(/\/$/, '')
  if (!secret) throw new Error('SUPABASE_SECRET_KEY manquant')

  return async (name, args) => {
    const response = await fetch(`${url}/rest/v1/rpc/${name}`, {
      method: 'POST',
      headers: {
        apikey: secret,
        Authorization: `Bearer ${secret}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(args ?? {}),
      signal: AbortSignal.timeout(90_000)
    })
    const body = await response.text()
    if (!response.ok) {
      const error = new Error(`rpc ${name} ${response.status}`)
      error.status = response.status
      error.body = body.slice(0, 240)
      throw error
    }
    return body ? JSON.parse(body) : null
  }
}

const takeToken = async (slotState) => {
  for (;;) {
    const result = reserveToken(slotState.bucket, Date.now())
    slotState.bucket = result.bucket
    if (result.ok) return
    await sleep(result.waitMs)
  }
}

const pullPage = async (rpc, runId, texteUid, decalage, slot, slotState) => {
  let lastMessage = ''
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    await takeToken(slotState)
    try {
      return await rpc('raw_pull_corpus_page', {
        p_run_id: runId,
        p_jeu: 'articles_textes',
        p_filtres: articleFiltres(texteUid),
        p_decalage: decalage,
        p_slot: slot,
        p_tri: 'ordre'
      })
    } catch (error) {
      lastMessage = String(error.message ?? '')
      const kind = classify(error)
      if (kind === 'rate' || kind === 'server') {
        if (kind === 'rate') slotState.bucket = { ...slotState.bucket, tokens: 0, updated: Date.now() }
        await sleep(2000 * attempt)
        continue
      }
      throw error
    }
  }
  throw new Error(`articles ${texteUid} indisponibles: ${lastMessage}`)
}

const pullArticles = async (rpc, runId, texteUid, slot, slotState) => {
  let decalage = 0
  let fetched = 0
  for (;;) {
    const page = await pullPage(rpc, runId, texteUid, decalage, slot, slotState)
    const pageCount = Number(page?.fetched ?? 0)
    fetched += pageCount
    if (isArticlePageClosed(pageCount)) return fetched
    decalage += pageCount
    if (decalage > 10000) return fetched
  }
}

const waitForAmendements = async (rpc) => {
  for (;;) {
    try {
      const counts = await rpc('raw_amendement_year_counts')
      const corpus = await rpc('raw_latest_corpus_run')
      const stored = corpus?.id ? await rpc('raw_corpus_state', { p_run_id: corpus.id }) : null
      const run = { status: stored?.status ?? corpus?.status, state: stored?.state }
      if (isAmendmentWindowReady(counts) && isCorpusSettled(run)) return counts
      console.log(
        `attente ${TARGET_YEAR} amendements=${counts?.[TARGET_YEAR] ?? 0} corpus=${run.status ?? 'absent'} file=${run.state?.queue?.length ?? 0}`
      )
    } catch (error) {
      console.log(`attente ${TARGET_YEAR} ${error.message}`)
    }
    await sleep(WAIT_MS)
  }
}

export const runTextes = async (rpc, { runId, state, slots }) => {
  await waitForAmendements(rpc)

  let activeRun = runId
  let activeState = state
  if (!activeRun) {
    activeRun = await rpc('raw_begin_textes')
    activeState = { calls: 0, closed: [], counts: { articles_textes: 0 } }
  }

  const cohort = await rpc('raw_texte_cohort')
  if (!Array.isArray(cohort)) throw new Error('cohorte illisible')
  const queue = pendingTexteUids(cohort, activeState.closed)
  const closed = new Set(activeState.closed ?? [])
  let calls = activeState.calls ?? 0
  let articles = activeState.counts?.articles_textes ?? 0

  const slotStates = new Map(
    slots.map((slot) => [
      slot,
      { bucket: { capacity: RATE_PER_ACCOUNT, tokens: RATE_PER_ACCOUNT, updated: Date.now() } }
    ])
  )
  const attempts = new Map()
  let inflight = 0
  let failure = null
  let creditsStopped = false
  let writing = Promise.resolve()
  let saveTimer = null
  const activeSlots = new Set(slots)

  const snapshot = () => ({
    calls,
    closed: [...closed],
    counts: { articles_textes: articles }
  })

  const save = (force = false) => {
    if (!force) {
      if (saveTimer) return writing
      saveTimer = setTimeout(() => {
        saveTimer = null
        save(true)
      }, 1000)
      return writing
    }
    const snap = snapshot()
    writing = writing
      .catch(() => {})
      .then(() => rpc('raw_textes_checkpoint', { p_run_id: activeRun, p_state: snap }))
      .catch(() => {})
    return writing
  }

  const worker = async (slot) => {
    const slotState = slotStates.get(slot)
    for (;;) {
      if (failure || !activeSlots.has(slot)) return
      const texteUid = queue.shift()
      if (!texteUid) {
        if (inflight === 0) return
        await sleep(40)
        continue
      }
      inflight += 1
      try {
        const fetched = await pullArticles(rpc, activeRun, texteUid, slot, slotState)
        calls += 1
        articles += fetched
        closed.add(texteUid)
        console.log(`articles ${texteUid} +${fetched} restants ${queue.length}`)
        save(false)
      } catch (error) {
        const kind = classify(error)
        if (kind === 'credits') {
          activeSlots.delete(slot)
          queue.unshift(texteUid)
          if (activeSlots.size === 0) creditsStopped = true
          return
        }
        const attempt = (attempts.get(texteUid) ?? 0) + 1
        attempts.set(texteUid, attempt)
        if ((kind === 'rate' || kind === 'server') && attempt <= 5) {
          queue.unshift(texteUid)
          continue
        }
        failure = error
        queue.unshift(texteUid)
        return
      } finally {
        inflight -= 1
      }
    }
  }

  const workers = slots.flatMap((slot) => Array.from({ length: IN_FLIGHT_PER_ACCOUNT }, () => worker(slot)))
  await Promise.all(workers)
  if (saveTimer) clearTimeout(saveTimer)
  await save(true)
  if (failure) throw failure

  if (creditsStopped || queue.length > 0) {
    return { runId: activeRun, stopped: 'credits', remaining: queue.length }
  }

  const linked = await rpc('raw_link_amendement_textes')
  await rpc('raw_finish_textes', { p_run_id: activeRun })
  return { runId: activeRun, stopped: 'done', texts: closed.size, linked }
}

const main = async () => {
  const args = process.argv.slice(2)
  const runFlag = args.indexOf('--run')
  const runId = runFlag >= 0 ? args[runFlag + 1] : null
  const rpc = createClient()
  const slots = keySlotsFromEnv(process.env)
  if (slots.length !== ACCOUNT_COUNT) throw new Error('HEMICYCLE_API_KEY_1, _2, _3 et _4 requis')

  for (const slot of slots) {
    await rpc('raw_store_hemicycle_key_slot', { p_slot: slot, p_key: process.env[`HEMICYCLE_API_KEY_${slot}`] })
  }

  let state = null
  if (runId) {
    const stored = await rpc('raw_textes_state', { p_run_id: runId })
    if (!stored?.state) throw new Error('reprise impossible')
    state = stored.state
  }

  console.log(
    `comptes ${slots.length} workers ${workerCount(slots.length)} plafond ${throughputPerMinute(slots.length)}/min annee ${TARGET_YEAR}`
  )
  const result = await runTextes(rpc, { runId, state, slots })
  console.log(JSON.stringify(result))
}

const invokedDirectly = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href
if (invokedDirectly) {
  main().catch((error) => {
    console.error(error.message)
    process.exitCode = 1
  })
}
