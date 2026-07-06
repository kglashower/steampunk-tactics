import { describe, expect, it } from 'vitest'
import { createInitialState } from '../../data/initialState'
import { createBattle } from '../battle/battle'
import { flatGrid } from '../battle/grid'
import { addXp, awardBattleXp, unitXpValue, xpToNext } from './leveling'
import type { Character } from '../../types'

function char(over: Partial<Character> = {}): Character {
  return {
    id: 'c', name: 'Test', job: 'soldier', level: 1, xp: 0, jp: 0,
    unlockedJobs: ['soldier', 'gunner', 'engineer'], unlocked: [],
    loadout: { actions: [null, null], reaction: null, passive: null, movement: null },
    equipment: {}, ...over,
  }
}

describe('addXp', () => {
  it('accumulates XP without leveling below the threshold', () => {
    const c = char()
    addXp(c, 50)
    expect(c.level).toBe(1)
    expect(c.xp).toBe(50)
  })

  it('levels up and carries the remainder', () => {
    const c = char()
    addXp(c, xpToNext(1) + 20) // 120
    expect(c.level).toBe(2)
    expect(c.xp).toBe(20)
  })

  it('can gain multiple levels from a big award', () => {
    const c = char()
    addXp(c, xpToNext(1) + xpToNext(2)) // 100 + 150
    expect(c.level).toBe(3)
    expect(c.xp).toBe(0)
  })
})

describe('awardBattleXp', () => {
  it('grants the enemy-XP total to each participating crew member', () => {
    const game = createInitialState()
    const battle = createBattle({
      grid: flatGrid(4, 4),
      units: [
        { id: 'c1', name: 'Brannock', team: 'player', pos: { x: 0, y: 0 }, abilities: ['wait'], stats: stats() },
        { id: 'enemy-0', name: 'Scrapling', team: 'enemy', pos: { x: 3, y: 3 }, abilities: ['wait'], stats: stats({ maxHp: 18, attack: 6 }) },
      ],
    })
    const expected = unitXpValue(battle.units['enemy-0'])
    const { game: after, rewards } = awardBattleXp(game, battle)
    expect(rewards).toHaveLength(1)
    expect(rewards[0]).toMatchObject({ charId: 'c1', gained: expected })
    expect(after.roster.c1.xp).toBe(expected)
    expect(game.roster.c1.xp).toBe(0) // original untouched (pure)
  })
})

function stats(over: Record<string, number> = {}) {
  return {
    maxHp: 30, hp: 30, maxSteam: 10, steam: 10,
    speed: 10, attack: 10, defense: 5, tech: 5, move: 4, jump: 1, steamRegen: 2, hover: false, ...over,
  }
}
