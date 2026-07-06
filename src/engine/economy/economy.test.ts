import { describe, expect, it } from 'vitest'
import { createInitialState } from '../../data/initialState'
import type { GameState } from '../../types'
import { activeBuildingLevel, build, buildableTypes, canBuild, upgrade } from './buildings'
import { canCraft, craft, craftBlocker, ownedCount } from './crafting'
import { characterStats, equip, equipmentBonus, unequip } from './equipment'

/** A game with plenty of resources for testing crafting/building. */
function richGame(): GameState {
  const g = createInitialState()
  g.resources = { coal: 100, iron: 100, copper: 100, quartz: 100 }
  return g
}

describe('buildings', () => {
  it('only allows a building on its matching territory type', () => {
    const g = richGame()
    expect(buildableTypes(g, 'ironhold')).toEqual(['forge']) // foundry
    expect(buildableTypes(g, 'verdigris-mesa')).toEqual([]) // wild, can't build yet
    g.territories['verdigris-mesa'].owner = 'player'
    expect(buildableTypes(g, 'verdigris-mesa')).toEqual(['workshop'])
  })

  it('builds and charges resources', () => {
    const g = richGame()
    expect(canBuild(g, 'ironhold', 'forge')).toBe(true)
    const after = build(g, 'ironhold', 'forge')
    expect(after.territories.ironhold.buildings).toEqual([{ type: 'forge', level: 1 }])
    expect(after.resources.iron).toBe(85) // 100 - 15
    expect(after.resources.coal).toBe(90) // 100 - 10
    expect(activeBuildingLevel(after, 'forge')).toBe(1)
  })

  it('cannot build the same building twice or afford with no resources', () => {
    let g = richGame()
    g = build(g, 'ironhold', 'forge')
    expect(buildableTypes(g, 'ironhold')).toEqual([])
    expect(canBuild(createInitialState(), 'ironhold', 'forge')).toBe(false) // no resources
  })

  it('upgrades to level 2', () => {
    let g = richGame()
    g = build(g, 'ironhold', 'forge')
    g = upgrade(g, 'ironhold', 'forge')
    expect(activeBuildingLevel(g, 'forge')).toBe(2)
  })

  it('an overrun territory provides no crafting capability', () => {
    let g = richGame()
    g = build(g, 'ironhold', 'forge')
    g.territories.ironhold.overrun = true
    expect(activeBuildingLevel(g, 'forge')).toBe(0)
  })
})

describe('crafting', () => {
  it('blocks crafting without the required building', () => {
    const g = richGame()
    expect(canCraft(g, 'iron_saber')).toBe(false)
    expect(craftBlocker(g, 'iron_saber')).toMatch(/Forge/)
  })

  it('crafts a tier-1 item once the Forge exists', () => {
    let g = richGame()
    g = build(g, 'ironhold', 'forge')
    expect(canCraft(g, 'iron_saber')).toBe(true)
    g = craft(g, 'iron_saber')
    expect(ownedCount(g, 'iron_saber')).toBe(1)
    expect(g.resources.iron).toBe(85 - 8)
  })

  it('a tier-2 upgrade needs Forge Lv2 and consumes the base item', () => {
    let g = richGame()
    g = build(g, 'ironhold', 'forge')
    g = craft(g, 'iron_saber')
    expect(craftBlocker(g, 'steel_saber')).toMatch(/Lv2/) // forge only L1
    g = upgrade(g, 'ironhold', 'forge')
    expect(canCraft(g, 'steel_saber')).toBe(true)
    g = craft(g, 'steel_saber')
    expect(ownedCount(g, 'steel_saber')).toBe(1)
    expect(ownedCount(g, 'iron_saber')).toBe(0) // consumed
  })
})

describe('equipment', () => {
  it('equipping an item raises battle stats and empties inventory', () => {
    let g = richGame()
    g.inventory = { iron_saber: 1 }
    const before = characterStats(g.roster.c1).attack
    g = equip(g, 'c1', 'iron_saber')
    expect(g.roster.c1.equipment.weapon).toBe('iron_saber')
    expect(ownedCount(g, 'iron_saber')).toBe(0)
    expect(characterStats(g.roster.c1).attack).toBe(before + 4)
    expect(equipmentBonus(g.roster.c1).attack).toBe(4)
  })

  it('swapping a slot returns the old item to inventory', () => {
    let g = richGame()
    g.inventory = { iron_saber: 1, steel_saber: 1 }
    g = equip(g, 'c1', 'iron_saber')
    g = equip(g, 'c1', 'steel_saber')
    expect(g.roster.c1.equipment.weapon).toBe('steel_saber')
    expect(ownedCount(g, 'iron_saber')).toBe(1) // returned
  })

  it('unequipping returns the item', () => {
    let g = richGame()
    g.inventory = { riveted_vest: 1 }
    g = equip(g, 'c1', 'riveted_vest')
    g = unequip(g, 'c1', 'armor')
    expect(g.roster.c1.equipment.armor).toBeUndefined()
    expect(ownedCount(g, 'riveted_vest')).toBe(1)
  })
})
