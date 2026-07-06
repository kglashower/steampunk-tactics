import { describe, expect, it } from 'vitest'
import { createInitialState } from '../../data/initialState'
import {
  attackProbability,
  countWildNeighbors,
  territoryAttackProbability,
} from './attackProbability'

describe('attackProbability', () => {
  it('is 0 when there are no wild neighbors (fully surrounded = safe)', () => {
    expect(attackProbability(0, 4)).toBe(0)
  })

  it('is the base rate when every neighbor is wild', () => {
    expect(attackProbability(4, 4, 0.5)).toBe(0.5)
    expect(attackProbability(2, 2, 0.5)).toBe(0.5)
  })

  it('scales with the fraction of wild neighbors', () => {
    expect(attackProbability(1, 4, 0.5)).toBeCloseTo(0.125)
    expect(attackProbability(2, 4, 0.5)).toBeCloseTo(0.25)
  })

  it('is 0 when the territory has no neighbors', () => {
    expect(attackProbability(0, 0)).toBe(0)
  })
})

describe('territory probabilities on the initial map', () => {
  it('Ironhold starts threatened: all neighbors are wild', () => {
    const state = createInitialState()
    const ironhold = state.territories['ironhold']
    expect(countWildNeighbors(state, ironhold)).toBe(3)
    expect(territoryAttackProbability(state, ironhold, 0.5)).toBe(0.5)
  })

  it('Ironhold becomes safe once all neighbors are player-owned', () => {
    const state = createInitialState()
    for (const id of state.territories['ironhold'].adjacency) {
      state.territories[id].owner = 'player'
    }
    const ironhold = state.territories['ironhold']
    expect(countWildNeighbors(state, ironhold)).toBe(0)
    expect(territoryAttackProbability(state, ironhold)).toBe(0)
  })

  it('wild territories never roll for attacks', () => {
    const state = createInitialState()
    const wild = state.territories['glass-spire']
    expect(territoryAttackProbability(state, wild)).toBe(0)
  })
})
