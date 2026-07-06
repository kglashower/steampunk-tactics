import { describe, expect, it } from 'vitest'
import { createBattle, endTurn, moveUnit, useAbility } from './battle'
import { effectiveDefense } from './combat'
import { flatGrid } from './grid'
import { testUnit } from './test-helpers'

// Helper: give one unit a head start so it is guaranteed to be active.
function firstActor(id: string) {
  return { ct: 100 as number, id }
}

describe('movement', () => {
  it('moves the active unit and blocks a second move', () => {
    let s = createBattle({
      grid: flatGrid(6, 6),
      units: [
        testUnit({ ...firstActor('hero'), team: 'player', pos: { x: 0, y: 0 }, abilities: ['wait'] }),
        testUnit({ id: 'foe', team: 'enemy', pos: { x: 5, y: 5 }, abilities: ['wait'], ct: 0, stats: { speed: 1 } }),
      ],
    })
    expect(s.activeUnitId).toBe('hero')
    s = moveUnit(s, 'hero', { x: 2, y: 0 })
    expect(s.units.hero.pos).toEqual({ x: 2, y: 0 })
    expect(() => moveUnit(s, 'hero', { x: 3, y: 0 })).toThrow()
  })
})

describe('attacks', () => {
  it('Strike damages an adjacent enemy', () => {
    let s = createBattle({
      grid: flatGrid(4, 1),
      units: [
        testUnit({ ...firstActor('hero'), team: 'player', pos: { x: 0, y: 0 }, abilities: ['strike', 'wait'], stats: { attack: 10 } }),
        testUnit({ id: 'foe', team: 'enemy', pos: { x: 1, y: 0 }, stats: { defense: 5, speed: 1 } }),
      ],
    })
    s = useAbility(s, 'hero', 'strike', { unitId: 'foe' })
    expect(s.units.foe.stats.hp).toBe(25) // 30 - (10 - 5)
  })

  it('refuses an out-of-range Strike', () => {
    const s = createBattle({
      grid: flatGrid(6, 1),
      units: [
        testUnit({ ...firstActor('hero'), team: 'player', pos: { x: 0, y: 0 }, abilities: ['strike', 'wait'] }),
        testUnit({ id: 'foe', team: 'enemy', pos: { x: 5, y: 0 }, stats: { speed: 1 } }),
      ],
    })
    expect(() => useAbility(s, 'hero', 'strike', { unitId: 'foe' })).toThrow(/range/i)
  })
})

describe('Field Repair', () => {
  it('revives a downed ally within range', () => {
    let s = createBattle({
      grid: flatGrid(4, 1),
      units: [
        testUnit({ ...firstActor('eng'), team: 'player', pos: { x: 0, y: 0 }, abilities: ['field_repair', 'wait'], stats: { tech: 12 } }),
        testUnit({ id: 'ally', team: 'player', pos: { x: 1, y: 0 }, stats: { speed: 1 } }),
        testUnit({ id: 'foe', team: 'enemy', pos: { x: 3, y: 0 }, stats: { speed: 1 } }),
      ],
    })
    s.units.ally.status = 'ko'
    s.units.ally.stats.hp = 0
    s = useAbility(s, 'eng', 'field_repair', { unitId: 'ally' })
    expect(s.units.ally.status).toBe('active')
    expect(s.units.ally.stats.hp).toBe(16) // tech 12 + power 4
  })
})

describe('Bulwark buff', () => {
  it('raises effective defense for the turn', () => {
    let s = createBattle({
      grid: flatGrid(3, 1),
      units: [
        testUnit({ ...firstActor('hero'), team: 'player', pos: { x: 0, y: 0 }, abilities: ['bulwark', 'wait'], stats: { defense: 8 } }),
        testUnit({ id: 'foe', team: 'enemy', pos: { x: 2, y: 0 }, stats: { speed: 1 } }),
      ],
    })
    s = useAbility(s, 'hero', 'bulwark', {})
    expect(effectiveDefense(s.units.hero)).toBe(13) // 8 + 5
    expect(s.units.hero.stats.steam).toBe(8) // 10 - 2 cost (no regen mid-turn)
  })
})

describe('Slam knockback', () => {
  it('pushes the target one tile directly away', () => {
    let s = createBattle({
      grid: flatGrid(5, 1),
      units: [
        testUnit({ ...firstActor('brute'), team: 'enemy', pos: { x: 1, y: 0 }, abilities: ['slam', 'wait'], stats: { attack: 12 } }),
        testUnit({ id: 'hero', team: 'player', pos: { x: 2, y: 0 }, stats: { defense: 5, maxHp: 50, hp: 50, speed: 1 } }),
      ],
    })
    s = useAbility(s, 'brute', 'slam', { unitId: 'hero' })
    expect(s.units.hero.pos).toEqual({ x: 3, y: 0 }) // shoved away
    expect(s.units.hero.stats.hp).toBeLessThan(50)
  })
})

describe('victory', () => {
  it('declares a win when the last enemy is downed', () => {
    let s = createBattle({
      grid: flatGrid(3, 1),
      units: [
        testUnit({ ...firstActor('hero'), team: 'player', pos: { x: 0, y: 0 }, abilities: ['strike', 'wait'], stats: { attack: 10 } }),
        testUnit({ id: 'foe', team: 'enemy', pos: { x: 1, y: 0 }, stats: { hp: 3, maxHp: 3, defense: 0, speed: 1 } }),
      ],
    })
    s = useAbility(s, 'hero', 'strike', { unitId: 'foe' })
    expect(s.units.foe.status).toBe('ko')
    expect(s.phase).toBe('won')
  })

  it('ends the turn and hands off to the next unit', () => {
    let s = createBattle({
      grid: flatGrid(6, 6),
      units: [
        // hero acts first via its CT head start, but the foe is faster, so it
        // comes up next once the hero spends its CT.
        testUnit({ ...firstActor('hero'), team: 'player', pos: { x: 0, y: 0 }, abilities: ['wait'], stats: { speed: 10 } }),
        testUnit({ id: 'foe', team: 'enemy', pos: { x: 5, y: 5 }, abilities: ['wait'], ct: 0, stats: { speed: 12 } }),
      ],
    })
    expect(s.activeUnitId).toBe('hero')
    s = endTurn(s, 'hero')
    expect(s.activeUnitId).toBe('foe')
  })
})
