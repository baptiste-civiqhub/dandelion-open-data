import { describe, expect, it } from 'vitest'

import { createRegistry, validatePlan } from '@/features/dataviz-assistant/lib/plan'

import { activeStep, buildOverviewTour, buildPfasTour, IDLE_TOUR, tourReducer, type TourState } from './tour'

const amendments = [
  { id: 'a26', numero: '26' },
  { id: 'a27', numero: '27' },
  { id: 'a2', numero: '2' }
]

describe('tourReducer', () => {
  it('does not start without an explicit start', () => {
    expect(tourReducer(IDLE_TOUR, 'tick', 6)).toEqual(IDLE_TOUR)
    expect(tourReducer(IDLE_TOUR, 'resume', 6)).toEqual(IDLE_TOUR)
    expect(activeStep(IDLE_TOUR, buildPfasTour(amendments, 'article:Article 1er'))).toBeNull()
  })

  it('starts, pauses, resumes, advances and stops', () => {
    let state: TourState = tourReducer(IDLE_TOUR, 'start', 3)
    expect(state).toEqual({ status: 'playing', index: 0 })
    state = tourReducer(state, 'tick', 3)
    state = tourReducer(state, 'pause', 3)
    expect(state).toEqual({ status: 'paused', index: 1 })
    expect(tourReducer(state, 'tick', 3)).toEqual(state)
    state = tourReducer(state, 'resume', 3)
    state = tourReducer(tourReducer(state, 'tick', 3), 'tick', 3)
    expect(state).toEqual({ status: 'done', index: 2 })
    expect(tourReducer(state, 'stop', 3)).toEqual(IDLE_TOUR)
  })

  it('pauses on user interruption and ignores interruptions when not playing', () => {
    const playing = tourReducer(IDLE_TOUR, 'start', 3)
    expect(tourReducer(playing, 'interrupt', 3).status).toBe('paused')
    expect(tourReducer(IDLE_TOUR, 'interrupt', 3)).toEqual(IDLE_TOUR)
  })
})

describe('buildPfasTour', () => {
  it('follows overview, article, 26/27, comparison, sources, global with valid plans', () => {
    const steps = buildPfasTour(amendments, 'article:Article 1er')
    expect(steps.map((step) => step.id)).toEqual(['overview', 'article', 'pair', 'comparison', 'sources', 'global'])
    const registry = createRegistry(['a26', 'a27', 'a2', 'article:Article 1er'])
    steps.forEach((step) => expect(validatePlan(step.plan, registry).ok).toBe(true))
    expect(steps[3]?.plan.actions[0]).toEqual({ type: 'compare', ids: ['a26', 'a27'] })
  })

  it('returns no tour when 26 or 27 is missing or ambiguous', () => {
    expect(buildPfasTour([{ id: 'a26', numero: '26' }], 'article:1')).toEqual([])
    expect(buildPfasTour([...amendments, { id: 'x', numero: '27' }], 'article:1')).toEqual([])
    expect(buildOverviewTour(null)).toEqual([])
    expect(buildOverviewTour('article:1')).toHaveLength(4)
  })
})
