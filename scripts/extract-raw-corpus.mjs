#!/usr/bin/env node
/**
 * Charge les cinq jeux bruts (documents, dossiers, actes, articles, amendements)
 * de l'Assemblée dans le schéma raw. Chaque page est lue par Postgres, pas par
 * cette machine : le script ne reçoit que le nombre de lignes et la clé de reprise.
 *
 *   pnpm extract:raw -- --plan
 *   pnpm extract:raw
 *   pnpm extract:raw -- --run <uuid>
 *
 * Quatre comptes : HEMICYCLE_API_KEY_1, HEMICYCLE_API_KEY_2, HEMICYCLE_API_KEY_3, HEMICYCLE_API_KEY_4.
 * SUPABASE_SECRET_KEY est requis.
 * Le plafond est 300 lectures/min par compte. Le script en ouvre 6 en vol sur chacun.
 */
import { existsSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

export const PAGE_SIZE = 200
export const ROTATE_AT = 2000
export const CORPUS_JEUX = ['documents', 'dossiers', 'actes', 'articles_textes', 'amendements']

// 300 lectures/min par compte. On reste en dessous, avec plusieurs requêtes en vol.
export const ACCOUNT_COUNT = 4
export const RATE_PER_ACCOUNT = 240
export const IN_FLIGHT_PER_ACCOUNT = 6

export const workerCount = (accounts, inFlight = IN_FLIGHT_PER_ACCOUNT) => Math.max(1, accounts) * inFlight

export const throughputPerMinute = (accounts, rate = RATE_PER_ACCOUNT) => Math.max(1, accounts) * rate

export const refillBucket = (bucket, now) => {
  const elapsed = Math.max(0, now - bucket.updated)
  const tokens = Math.min(bucket.capacity, bucket.tokens + (elapsed / 60_000) * bucket.capacity)
  return { ...bucket, tokens, updated: now }
}

export const reserveToken = (bucket, now) => {
  const filled = refillBucket(bucket, now)
  if (filled.tokens < 1) {
    return {
      ok: false,
      waitMs: Math.ceil(((1 - filled.tokens) / filled.capacity) * 60_000),
      bucket: filled
    }
  }
  return { ok: true, bucket: { ...filled, tokens: filled.tokens - 1 } }
}

export const keySlotsFromEnv = (env) => {
  const slots = []
  for (let slot = 1; slot <= ACCOUNT_COUNT; slot += 1) {
    if (env[`HEMICYCLE_API_KEY_${slot}`]) slots.push(slot)
  }
  return slots
}

const LEGISLATURES = ['14', '15', '16', '17']
const AMENDMENT_FROM_YEAR = 2026
const AMENDMENT_TO_YEAR = 2026

const emptyCounts = () => ({
  documents: 0,
  dossiers: 0,
  actes: 0,
  articles_textes: 0,
  amendements: 0
})

const makeWindow = (jeu, filtres) => ({
  jeu,
  filtres,
  decalage: 0,
  lower: null,
  lowerOp: 'gt'
})

export const initialWindows = () => {
  const windows = []

  for (const legislature of LEGISLATURES) {
    windows.push(makeWindow('documents', [{ colonne: 'legislature', op: 'eq', valeur: legislature }]))
    windows.push(makeWindow('dossiers', [{ colonne: 'legislature', op: 'eq', valeur: legislature }]))
    windows.push(makeWindow('actes', [{ colonne: 'uid', op: 'like', valeur: `L${legislature}-` }]))
    windows.push(makeWindow('articles_textes', [{ colonne: 'texte_uid', op: 'like', valeur: `L${legislature}` }]))
  }

  for (let year = AMENDMENT_TO_YEAR; year >= AMENDMENT_FROM_YEAR; year -= 1) {
    for (let month = 12; month >= 1; month -= 1) {
      const start = `${year}-${String(month).padStart(2, '0')}-01`
      const end = month === 12 ? `${year + 1}-01-01` : `${year}-${String(month + 1).padStart(2, '0')}-01`
      windows.push(
        makeWindow('amendements', [
          { colonne: 'date_depot', op: 'gte', valeur: start },
          { colonne: 'date_depot', op: 'lt', valeur: end }
        ])
      )
    }
  }

  return windows
}

export const requestFiltres = (current) => {
  if (!current.lower) return current.filtres
  const colonne = current.jeu === 'articles_textes' ? 'texte_uid' : 'uid'
  return [...current.filtres, { colonne, op: current.lowerOp, valeur: current.lower }]
}

const rotated = (current, key) => ({
  ...current,
  decalage: 0,
  lower: key,
  lowerOp: 'gt'
})

export const advanceWindow = (current, page) => {
  const mustRotate = page.ceiling || current.decalage + page.fetched >= ROTATE_AT

  if (!mustRotate) {
    if (page.fetched < PAGE_SIZE) return { action: 'done' }
    return { action: 'continue', window: { ...current, decalage: current.decalage + page.fetched } }
  }

  if (!page.key) return { action: 'stuck' }
  if (current.lower === page.key && current.lowerOp === 'gt') return { action: 'stuck' }

  const next = rotated(current, page.key)
  if (current.jeu === 'articles_textes') return { action: 'flush', texteUid: page.key, window: next }
  return { action: 'rotate', window: next }
}

export const splitWindow = (current) => {
  const start = current.filtres.find((filtre) => filtre.op === 'gte' && filtre.colonne.startsWith('date_'))
  const end = current.filtres.find((filtre) => filtre.op === 'lt' && filtre.colonne === start?.colonne)
  if (!start || !end) return null

  const from = Date.parse(start.valeur)
  const to = Date.parse(end.valeur)
  if (!Number.isFinite(from) || !Number.isFinite(to) || to - from <= 24 * 60 * 60 * 1000) return null

  const mid = new Date(from + Math.floor((to - from) / 2)).toISOString().slice(0, 10)
  const rest = current.filtres.filter((filtre) => filtre !== start && filtre !== end)
  const column = start.colonne

  return [
    makeWindow(current.jeu, [
      ...rest,
      { colonne: column, op: 'gte', valeur: start.valeur },
      { colonne: column, op: 'lt', valeur: mid }
    ]),
    makeWindow(current.jeu, [
      ...rest,
      { colonne: column, op: 'gte', valeur: mid },
      { colonne: column, op: 'lt', valeur: end.valeur }
    ])
  ]
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
  if (body.includes('422') || body.includes('trop longue') || message.includes('422')) return 'slow'
  if ((error.status ?? 0) >= 500) return 'server'
  if (message === 'fetch failed' || /ECONNRESET|ETIMEDOUT|UND_ERR|TimeoutError|aborted|network/i.test(message)) return 'server'
  return 'fatal'
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

const createClient = () => {
  const root = join(dirname(fileURLToPath(import.meta.url)), '..')
  loadEnvFile(join(root, '.env'))
  loadEnvFile(join(root, '.env.local'))

  const secret = process.env.SUPABASE_SECRET_KEY
  const url = (process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://mloaychfjhajdjfktcjp.supabase.co').replace(/\/$/, '')
  if (!secret) {
    throw new Error('SUPABASE_SECRET_KEY manquant')
  }

  return async (name, args) => {
    const response = await fetch(`${url}/rest/v1/rpc/${name}`, {
      method: 'POST',
      headers: {
        apikey: secret,
        Authorization: `Bearer ${secret}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(args),
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

const pull = (rpc, runId, jeu, filtres, decalage, slot) =>
  rpc('raw_pull_corpus_page', {
    p_run_id: runId,
    p_jeu: jeu,
    p_filtres: filtres,
    p_decalage: decalage,
    p_slot: slot
  })

const checkpoint = (rpc, runId, state) => rpc('raw_corpus_checkpoint', { p_run_id: runId, p_state: state })

const newBucket = () => ({ capacity: RATE_PER_ACCOUNT, tokens: RATE_PER_ACCOUNT, updated: Date.now() })

async function takeToken(slotState) {
  for (;;) {
    const result = reserveToken(slotState.bucket, Date.now())
    slotState.bucket = result.bucket
    if (result.ok) return
    await sleep(result.waitMs)
  }
}

async function pullPage(rpc, runId, jeu, filtres, decalage, slot, slotState) {
  let lastMessage = ''
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    await takeToken(slotState)
    try {
      return await pull(rpc, runId, jeu, filtres, decalage, slot)
    } catch (error) {
      lastMessage = String(error.message ?? '')
      const kind = classify(error)
      if (kind === 'rate') {
        slotState.bucket = { ...slotState.bucket, tokens: 0, updated: Date.now() }
        await sleep(2000 * attempt)
        continue
      }
      if (kind === 'server') {
        await sleep(2000 * attempt)
        continue
      }
      throw error
    }
  }
  throw new Error(`page ${jeu} indisponible: ${lastMessage}`)
}

async function flushText(rpc, runId, state, texteUid, slot, slotState) {
  let decalage = 0
  for (;;) {
    const page = await pullPage(
      rpc,
      runId,
      'articles_textes',
      [{ colonne: 'texte_uid', op: 'eq', valeur: texteUid }],
      decalage,
      slot,
      slotState
    )
    state.calls += 1
    state.counts.articles_textes += page.fetched
    if (page.fetched < PAGE_SIZE) return
    decalage += page.fetched
    if (decalage > 2000) return
  }
}

export async function runCorpus(rpc, { runId, state, slots = [1] }) {
  let activeRun = runId
  if (!activeRun) {
    activeRun = await rpc('raw_begin_corpus')
    state = { calls: 0, counts: emptyCounts(), queue: initialWindows() }
  }

  const activeSlots = new Set(slots)
  const slotStates = new Map(slots.map((slot) => [slot, { bucket: newBucket() }]))
  let inflight = 0
  let failure = null
  let creditsStopped = false
  let writing = Promise.resolve()
  let saveTimer = null

  const save = (force = false) => {
    if (!force) {
      if (saveTimer) return writing
      saveTimer = setTimeout(() => {
        saveTimer = null
        save(true)
      }, 1000)
      return writing
    }
    const snap = structuredClone(state)
    writing = writing
      .catch(() => {})
      .then(() => checkpoint(rpc, activeRun, snap))
      .catch(() => {})
    return writing
  }

  const worker = async (slot) => {
    const slotState = slotStates.get(slot)
    for (;;) {
      if (failure || !activeSlots.has(slot)) return
      const current = state.queue.shift()
      if (!current) {
        if (inflight === 0) return
        await sleep(40)
        continue
      }

      inflight += 1
      try {
        const page = await pullPage(
          rpc,
          activeRun,
          current.jeu,
          requestFiltres(current),
          current.decalage,
          slot,
          slotState
        )
        state.calls += 1
        state.counts[current.jeu] += page.fetched
        const step = advanceWindow(current, page)

        if (step.action === 'continue' || step.action === 'rotate') state.queue.unshift(step.window)
        else if (step.action === 'flush') {
          await flushText(rpc, activeRun, state, step.texteUid, slot, slotState)
          state.queue.unshift(step.window)
        } else if (step.action !== 'done') {
          throw new Error(`curseur bloque sur ${current.jeu}`)
        }

        console.log(`${current.jeu} +${page.fetched} compte ${slot} appels ${state.calls}`)
        save(false)
      } catch (error) {
        const kind = classify(error)
        const canSplit = kind === 'slow' || /indisponible/.test(String(error.message ?? ''))
        if (canSplit) {
          const halves = splitWindow(current)
          if (halves) {
            state.queue.unshift(...halves)
            continue
          }
          current.failures = (current.failures ?? 0) + 1
          if (current.failures <= 2) {
            state.queue.push(current)
            continue
          }
          state.blocked = state.blocked ?? []
          state.blocked.push({ jeu: current.jeu, filtres: current.filtres, decalage: current.decalage })
          console.log(`bloque ${current.jeu} decalage ${current.decalage}`)
          continue
        }
        if (kind === 'credits') {
          activeSlots.delete(slot)
          state.queue.unshift(current)
          if (activeSlots.size === 0) creditsStopped = true
          return
        }
        current.attempts = (current.attempts ?? 0) + 1
        if ((kind === 'rate' || kind === 'server') && current.attempts <= 5) {
          state.queue.unshift(current)
          continue
        }
        failure = error
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
  await save(true)
  if (creditsStopped || (activeSlots.size === 0 && state.queue.length > 0)) {
    return { runId: activeRun, stopped: 'credits', state }
  }
  if ((state.blocked ?? []).length > 0) {
    return { runId: activeRun, stopped: 'blocked', blocked: state.blocked.length }
  }

  const counts = await rpc('raw_finish_corpus', { p_run_id: activeRun })
  return { runId: activeRun, stopped: 'done', counts }
}

const printPlan = () => {
  const windows = initialWindows()
  const byJeu = Object.fromEntries(CORPUS_JEUX.map((jeu) => [jeu, 0]))
  for (const item of windows) byJeu[item.jeu] += 1
  console.log(`fenetres ${windows.length}`)
  for (const jeu of CORPUS_JEUX) console.log(`${jeu} ${byJeu[jeu]}`)
}

const main = async () => {
  const args = process.argv.slice(2)
  if (args.includes('--plan')) {
    printPlan()
    return
  }

  const runFlag = args.indexOf('--run')
  const runId = runFlag >= 0 ? args[runFlag + 1] : null
  const rpc = createClient()
  const slots = keySlotsFromEnv(process.env)
  if (slots.length !== ACCOUNT_COUNT) throw new Error('HEMICYCLE_API_KEY_1, _2, _3 et _4 requis')

  for (const slot of slots) {
    await rpc('raw_store_hemicycle_key_slot', { p_slot: slot, p_key: process.env[`HEMICYCLE_API_KEY_${slot}`] })
  }

  let state = { calls: 0, counts: emptyCounts(), queue: initialWindows() }
  if (runId) {
    const stored = await rpc('raw_corpus_state', { p_run_id: runId })
    if (!stored?.state?.queue) throw new Error('reprise impossible')
    state = stored.state
  }

  console.log(
    `comptes ${slots.length} workers ${workerCount(slots.length)} plafond ${throughputPerMinute(slots.length)}/min`
  )
  const result = await runCorpus(rpc, { runId, state, slots })
  console.log(JSON.stringify({ runId: result.runId, stopped: result.stopped }))
}

const invokedDirectly = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href
if (invokedDirectly) {
  main().catch((error) => {
    console.error(error.message)
    process.exitCode = 1
  })
}
