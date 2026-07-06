import { describe, expect, it } from 'vitest'
import { runEnemyTurn } from './ai'
import { createBattle } from './battle'
import { flatGrid } from './grid'
import { testUnit } from './test-helpers'

const first = (id: string) => ({ ct: 100 as number, id })

describe('smart AI', () => {
  it('uses an AoE attack to hit a cluster of foes', () => {
    let s = createBattle({
      grid: flatGrid(5, 3),
      units: [
        testUnit({ ...first('mon'), team: 'enemy', pos: { x: 2, y: 1 }, abilities: ['cleave', 'strike', 'wait'], stats: { attack: 12, maxSteam: 10, steam: 10 } }),
        testUnit({ id: 'a', team: 'player', pos: { x: 1, y: 1 }, abilities: ['wait'], stats: { defense: 2, speed: 1 } }),
        testUnit({ id: 'b', team: 'player', pos: { x: 2, y: 0 }, abilities: ['wait'], stats: { defense: 2, speed: 1 } }),
      ],
    })
    s = runEnemyTurn(s, 'mon')
    // Cleave should have struck both adjacent foes, not just one.
    expect(s.units.a.stats.hp).toBeLessThan(30)
    expect(s.units.b.stats.hp).toBeLessThan(30)
  })

  it('heals a wounded ally instead of chasing a distant foe', () => {
    let s = createBattle({
      grid: flatGrid(10, 1),
      units: [
        testUnit({ ...first('medic'), team: 'enemy', pos: { x: 1, y: 0 }, abilities: ['field_repair', 'wait'], stats: { tech: 12, maxSteam: 10, steam: 10 } }),
        testUnit({ id: 'hurt', team: 'enemy', pos: { x: 2, y: 0 }, abilities: ['wait'], stats: { maxHp: 40, hp: 10, speed: 1 } }),
        testUnit({ id: 'foe', team: 'player', pos: { x: 9, y: 0 }, abilities: ['wait'], stats: { speed: 1 } }),
      ],
    })
    s = runEnemyTurn(s, 'medic')
    expect(s.units.hurt.stats.hp).toBeGreaterThan(10) // got patched up
  })

  it('buffs with Overpressure when a foe is near but unreachable', () => {
    let s = createBattle({
      grid: flatGrid(8, 1),
      units: [
        testUnit({ ...first('brute'), team: 'enemy', pos: { x: 0, y: 0 }, abilities: ['slam', 'overpressure', 'wait'], stats: { move: 2, attack: 16 } }),
        // Foe is near (within engage range) but out of move+melee reach this turn.
        testUnit({ id: 'foe', team: 'player', pos: { x: 6, y: 0 }, abilities: ['wait'], stats: { speed: 1 } }),
      ],
    })
    s = runEnemyTurn(s, 'brute')
    expect(s.units.brute.buffs.some((b) => b.id === 'overpressure')).toBe(true)
  })
})
