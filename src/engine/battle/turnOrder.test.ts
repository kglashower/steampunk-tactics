import { describe, expect, it } from 'vitest'
import { createBattle, endTurn } from './battle'
import { flatGrid } from './grid'
import { testUnit } from './test-helpers'
import { advanceTurn } from './turnOrder'
import type { BattleState } from './types'

function battleWith(...units: ReturnType<typeof testUnit>[]): BattleState {
  return createBattle({ grid: flatGrid(6, 6), units })
}

describe('Charge-Time turn order', () => {
  it('the fastest unit takes the first turn', () => {
    const s = battleWith(
      testUnit({ id: 'slow', team: 'player', pos: { x: 0, y: 0 }, stats: { speed: 8 } }),
      testUnit({ id: 'fast', team: 'enemy', pos: { x: 5, y: 5 }, stats: { speed: 15 } }),
    )
    expect(s.activeUnitId).toBe('fast')
  })

  it('carries leftover CT so faster units act more often', () => {
    let s = battleWith(
      testUnit({ id: 'fast', team: 'player', pos: { x: 0, y: 0 }, abilities: ['wait'], stats: { speed: 20 } }),
      testUnit({ id: 'slow', team: 'enemy', pos: { x: 5, y: 5 }, abilities: ['wait'], stats: { speed: 10 } }),
    )
    const order: string[] = []
    for (let i = 0; i < 4; i++) {
      order.push(s.activeUnitId!)
      s = endTurn(s, s.activeUnitId!)
    }
    // Roughly 2:1 cadence — the fast unit appears more than the slow one.
    const fastCount = order.filter((id) => id === 'fast').length
    const slowCount = order.filter((id) => id === 'slow').length
    expect(fastCount).toBeGreaterThan(slowCount)
  })

  it('skips knocked-out units when choosing the next turn', () => {
    let s = battleWith(
      testUnit({ id: 'a', team: 'player', pos: { x: 0, y: 0 }, stats: { speed: 12 } }),
      testUnit({ id: 'b', team: 'enemy', pos: { x: 5, y: 5 }, stats: { speed: 10 } }),
    )
    s.units.a.status = 'ko'
    s = advanceTurn(s)
    expect(s.activeUnitId).toBe('b')
  })

  it('ticks down and expires buffs at the start of a unit turn', () => {
    let s = battleWith(
      testUnit({ id: 'a', team: 'player', pos: { x: 0, y: 0 }, stats: { speed: 10 } }),
    )
    s.units.a.buffs = [{ id: 'bulwark', defense: 5, turns: 1 }]
    s.units.a.ct = 0
    s = advanceTurn(s)
    expect(s.activeUnitId).toBe('a')
    expect(s.units.a.buffs).toHaveLength(0)
  })
})
