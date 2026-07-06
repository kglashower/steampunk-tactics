import { describe, expect, it } from 'vitest'
import { createInitialState } from '../../data/initialState'
import { resolveEndTurn } from './turnResolution'

const ALWAYS = () => 0 // roll always triggers an attack
const NEVER = () => 0.999 // roll never triggers

describe('resolveEndTurn — production', () => {
  it('produces from owned, active territories and advances the turn', () => {
    const { game, summary } = resolveEndTurn(createInitialState(), NEVER)
    expect(game.resources.iron).toBe(3) // only Ironhold is owned at start
    expect(game.resources.coal).toBe(0)
    expect(game.turn).toBe(2)
    expect(summary.produced.iron).toBe(3)
  })

  it('does not produce from an overrun territory', () => {
    const start = createInitialState()
    start.territories.ironhold.overrun = true
    const { game } = resolveEndTurn(start, NEVER)
    expect(game.resources.iron).toBe(0)
  })
})

describe('resolveEndTurn — incursions', () => {
  it('overruns an undefended exposed territory when attacked', () => {
    const { game, summary } = resolveEndTurn(createInitialState(), ALWAYS)
    expect(game.territories.ironhold.overrun).toBe(true)
    expect(summary.newlyOverrun).toContain('ironhold')
    expect(summary.incursions[0]).toMatchObject({ territoryId: 'ironhold', defended: false })
  })

  it('a strong garrison holds the line', () => {
    const start = createInitialState()
    start.territories.ironhold.garrison = ['c1', 'c2', 'c3'] // the whole crew
    const { game, summary } = resolveEndTurn(start, ALWAYS)
    expect(game.territories.ironhold.overrun).toBe(false)
    expect(summary.incursions[0]).toMatchObject({ defended: true, held: true })
  })

  it('does not roll for a fully-surrounded (safe) territory', () => {
    const start = createInitialState()
    for (const id of start.territories.ironhold.adjacency) {
      start.territories[id].owner = 'player'
    }
    // Ironhold now has 0 wild neighbors -> never attacked, even on a guaranteed roll.
    const { game } = resolveEndTurn(start, ALWAYS)
    expect(game.territories.ironhold.overrun).toBe(false)
  })

  it('no incursions when rolls never trigger', () => {
    const { summary } = resolveEndTurn(createInitialState(), NEVER)
    expect(summary.incursions).toHaveLength(0)
  })
})
