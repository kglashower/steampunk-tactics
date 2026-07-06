import { describe, expect, it } from 'vitest'
import { computeDamage, computeHeal, effectiveDefense, heightBonus } from './combat'
import { makeGrid, flatGrid } from './grid'
import type { BattleUnit } from './types'

function unit(over: Partial<BattleUnit['stats']>, pos = { x: 0, y: 0 }): BattleUnit {
  return {
    id: 'x', name: 'x', team: 'player', pos, buffs: [], ct: 0, status: 'active',
    hasMoved: false, hasActed: false, abilities: [],
    stats: {
      maxHp: 30, hp: 30, maxSteam: 10, steam: 10,
      speed: 10, attack: 10, defense: 5, tech: 5, move: 4, jump: 1, steamRegen: 2, hover: false, ...over,
    },
  }
}

describe('heightBonus', () => {
  it('rewards attacking from higher ground, clamped to +/-2', () => {
    const grid = makeGrid([[0, 5]]) // x=0 height 0, x=1 height 5
    expect(heightBonus(grid, { x: 1, y: 0 }, { x: 0, y: 0 })).toBe(2) // high -> low, clamped
    expect(heightBonus(grid, { x: 0, y: 0 }, { x: 1, y: 0 })).toBe(-2)
  })
})

describe('computeDamage', () => {
  it('is attack + power - defense, at least 1', () => {
    const grid = flatGrid(2, 1)
    const atk = unit({ attack: 12 }, { x: 0, y: 0 })
    const def = unit({ defense: 4 }, { x: 1, y: 0 })
    expect(computeDamage(grid, atk, def, 0)).toBe(8)
  })

  it('never drops below 1 even against heavy armor', () => {
    const grid = flatGrid(2, 1)
    const atk = unit({ attack: 3 }, { x: 0, y: 0 })
    const def = unit({ defense: 99 }, { x: 1, y: 0 })
    expect(computeDamage(grid, atk, def, 0)).toBe(1)
  })

  it('adds the height bonus', () => {
    const grid = makeGrid([[0, 2]])
    const atk = unit({ attack: 10 }, { x: 1, y: 0 }) // on the height-2 tile
    const def = unit({ defense: 5 }, { x: 0, y: 0 })
    // 10 + 0 + 2 (height) - 5 = 7
    expect(computeDamage(grid, atk, def, 0)).toBe(7)
  })
})

describe('buffs and heal', () => {
  it('effectiveDefense includes buffs', () => {
    const u = unit({ defense: 5 })
    u.buffs = [{ id: 'bulwark', defense: 5, turns: 1 }]
    expect(effectiveDefense(u)).toBe(10)
  })

  it('computeHeal scales with Tech', () => {
    expect(computeHeal(unit({ tech: 12 }), 4)).toBe(16)
  })
})
