import { describe, expect, it } from 'vitest'
import { createSkirmish } from '../../data/encounters'
import { runEnemyTurn } from './ai'
import { createBattle, endTurn } from './battle'
import { flatGrid } from './grid'
import { testUnit } from './test-helpers'
import type { BattleState } from './types'

describe('enemy AI', () => {
  it('attacks a foe it can reach this turn', () => {
    let s = createBattle({
      grid: flatGrid(6, 1),
      units: [
        testUnit({ id: 'mon', team: 'enemy', pos: { x: 3, y: 0 }, abilities: ['bite', 'wait'], ct: 100, stats: { attack: 10, move: 4 } }),
        testUnit({ id: 'hero', team: 'player', pos: { x: 1, y: 0 }, abilities: ['wait'], ct: 0, stats: { defense: 2, speed: 1 } }),
      ],
    })
    const before = s.units.hero.stats.hp
    s = runEnemyTurn(s, 'mon')
    expect(s.units.hero.stats.hp).toBeLessThan(before)
  })

  it('advances toward a foe it cannot yet reach', () => {
    let s = createBattle({
      grid: flatGrid(12, 1),
      units: [
        testUnit({ id: 'mon', team: 'enemy', pos: { x: 0, y: 0 }, abilities: ['bite', 'wait'], ct: 100, stats: { move: 3 } }),
        testUnit({ id: 'hero', team: 'player', pos: { x: 11, y: 0 }, abilities: ['wait'], ct: 0, stats: { speed: 1 } }),
      ],
    })
    s = runEnemyTurn(s, 'mon')
    expect(s.units.mon.pos.x).toBe(3) // moved its full Move toward the hero
  })
})

describe('full auto-resolved battle', () => {
  it('reaches a decisive result with no infinite loop', () => {
    let s: BattleState = createBattle(createSkirmish())
    let guard = 0
    while (s.phase === 'in-progress' && guard < 1000) {
      const id = s.activeUnitId
      if (!id) {
        s = endTurn(s, Object.keys(s.units)[0]) // shouldn't happen, safety
        continue
      }
      // Drive every unit (both teams) with the same utility AI.
      s = runEnemyTurn(s, id)
      guard++
    }
    expect(['won', 'lost']).toContain(s.phase)
    expect(guard).toBeLessThan(1000)
  })
})
