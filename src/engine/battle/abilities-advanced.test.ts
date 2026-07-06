import { describe, expect, it } from 'vitest'
import { createBattle, useAbility } from './battle'
import { effectiveDefense, effectiveSpeed } from './combat'
import { flatGrid } from './grid'
import { testUnit } from './test-helpers'

const first = (id: string) => ({ ct: 100 as number, id })

describe('AoE abilities', () => {
  it('Cleave hits every enemy adjacent to the caster', () => {
    let s = createBattle({
      grid: flatGrid(4, 3),
      units: [
        testUnit({ ...first('hero'), team: 'player', pos: { x: 1, y: 1 }, abilities: ['cleave', 'wait'], stats: { attack: 12, maxSteam: 10, steam: 10 } }),
        testUnit({ id: 'e1', team: 'enemy', pos: { x: 0, y: 1 }, stats: { defense: 2, speed: 1 } }),
        testUnit({ id: 'e2', team: 'enemy', pos: { x: 1, y: 0 }, stats: { defense: 2, speed: 1 } }),
        testUnit({ id: 'far', team: 'enemy', pos: { x: 3, y: 2 }, stats: { defense: 2, speed: 1 } }),
      ],
    })
    s = useAbility(s, 'hero', 'cleave', {})
    expect(s.units.e1.stats.hp).toBeLessThan(30) // adjacent — hit
    expect(s.units.e2.stats.hp).toBeLessThan(30) // adjacent — hit
    expect(s.units.far.stats.hp).toBe(30) // out of range — untouched
  })
})

describe('debuffs', () => {
  it('Suppress applies a Slow that lowers effective speed', () => {
    let s = createBattle({
      grid: flatGrid(5, 1),
      units: [
        testUnit({ ...first('g'), team: 'player', pos: { x: 0, y: 0 }, abilities: ['suppress', 'wait'], stats: { maxSteam: 10, steam: 10 } }),
        testUnit({ id: 'foe', team: 'enemy', pos: { x: 2, y: 0 }, stats: { speed: 12, defense: 2 } }),
      ],
    })
    s = useAbility(s, 'g', 'suppress', { unitId: 'foe' })
    expect(s.units.foe.stats.hp).toBeLessThan(30)
    expect(effectiveSpeed(s.units.foe)).toBe(6) // 12 - 6
  })

  it('Shield Breaker Exposes the target (lower effective defense)', () => {
    let s = createBattle({
      grid: flatGrid(3, 1),
      units: [
        testUnit({ ...first('s'), team: 'player', pos: { x: 0, y: 0 }, abilities: ['shield_breaker', 'wait'], stats: { attack: 12, maxSteam: 10, steam: 10 } }),
        testUnit({ id: 'foe', team: 'enemy', pos: { x: 1, y: 0 }, stats: { defense: 8, maxHp: 50, hp: 50, speed: 1 } }),
      ],
    })
    s = useAbility(s, 's', 'shield_breaker', { unitId: 'foe' })
    expect(effectiveDefense(s.units.foe)).toBe(3) // 8 - 5 expose
  })
})

describe('reactions', () => {
  it('Guard reduces incoming damage by a flat amount', () => {
    const base = createBattle({
      grid: flatGrid(3, 1),
      units: [
        testUnit({ ...first('a'), team: 'player', pos: { x: 0, y: 0 }, abilities: ['strike', 'wait'], stats: { attack: 12 } }),
        testUnit({ id: 'foe', team: 'enemy', pos: { x: 1, y: 0 }, stats: { defense: 4, maxHp: 50, hp: 50, speed: 1 } }),
      ],
    })
    const plain = useAbility(base, 'a', 'strike', { unitId: 'foe' }).units.foe.stats.hp
    // Same fight, but the defender has Guard slotted.
    base.units.foe.reaction = 'guard'
    const guarded = useAbility(base, 'a', 'strike', { unitId: 'foe' }).units.foe.stats.hp
    expect(guarded).toBeGreaterThan(plain) // took 4 less damage
  })

  it('Counter ripostes an adjacent melee attacker', () => {
    let s = createBattle({
      grid: flatGrid(3, 1),
      units: [
        testUnit({ ...first('a'), team: 'player', pos: { x: 0, y: 0 }, abilities: ['strike', 'wait'], stats: { attack: 10, maxHp: 40, hp: 40 } }),
        testUnit({ id: 'foe', team: 'enemy', pos: { x: 1, y: 0 }, stats: { attack: 10, defense: 2, maxHp: 60, hp: 60, speed: 1 } }),
      ],
    })
    s.units.foe.reaction = 'counter'
    s = useAbility(s, 'a', 'strike', { unitId: 'foe' })
    expect(s.units.foe.stats.hp).toBeLessThan(60) // hit
    expect(s.units.a.stats.hp).toBeLessThan(40) // countered
  })
})

describe('targeted ally buff', () => {
  it('Fortify raises an ally\'s effective defense', () => {
    let s = createBattle({
      grid: flatGrid(4, 1),
      units: [
        testUnit({ ...first('eng'), team: 'player', pos: { x: 0, y: 0 }, abilities: ['fortify', 'wait'], stats: { maxSteam: 10, steam: 10 } }),
        testUnit({ id: 'ally', team: 'player', pos: { x: 1, y: 0 }, stats: { defense: 5, speed: 1 } }),
        testUnit({ id: 'foe', team: 'enemy', pos: { x: 3, y: 0 }, stats: { speed: 1 } }),
      ],
    })
    s = useAbility(s, 'eng', 'fortify', { unitId: 'ally' })
    expect(effectiveDefense(s.units.ally)).toBe(11) // 5 + 6
  })
})
