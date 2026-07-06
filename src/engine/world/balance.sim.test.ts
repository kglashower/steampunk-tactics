import { describe, expect, it } from 'vitest'
import { createInitialState } from '../../data/initialState'
import { runEnemyTurn } from '../battle/ai'
import { createBattle } from '../battle/battle'
import type { BattleState } from '../battle/types'
import type { Character, EquipSlot, JobId, Loadout } from '../../types'
import { buildWorldBattle } from './encounterBuilder'

// Combat is deterministic (no RNG), so each matchup resolves the same way every
// time. We drive both sides with the production AI and check the outcome —
// turning "balance" into repeatable assertions.

type BaseJob = 'soldier' | 'gunner' | 'engineer'
const L = (actions: [string | null, string | null], reaction: string | null, passive: string | null, movement: string | null): Loadout => ({ actions, reaction, passive, movement })

// A fresh crew: level 1, one starting action each (matches the initial roster).
const FRESH: Record<BaseJob, { unlocked: string[]; loadout: Loadout }> = {
  soldier: { unlocked: ['power_strike'], loadout: L(['power_strike', null], null, null, null) },
  gunner: { unlocked: ['aimed_shot'], loadout: L(['aimed_shot', null], null, null, null) },
  engineer: { unlocked: ['field_repair'], loadout: L(['field_repair', null], null, null, null) },
}

// A fully kitted crew: full loadouts + tier-3 gear.
const KIT: Record<BaseJob, { unlocked: string[]; loadout: Loadout; gear: Partial<Record<EquipSlot, string>> }> = {
  soldier: {
    unlocked: ['power_strike', 'cleave', 'toughness', 'sprint', 'guard'],
    loadout: L(['power_strike', 'cleave'], 'guard', 'toughness', 'sprint'),
    gear: { weapon: 'tempered_greatblade', armor: 'aegis_plate', accessory: 'charged_greaves' },
  },
  gunner: {
    unlocked: ['aimed_shot', 'scattershot', 'focus', 'long_stride'],
    loadout: L(['aimed_shot', 'scattershot'], null, 'focus', 'long_stride'),
    gear: { weapon: 'repeating_rifle', armor: 'recoil_harness', accessory: 'marksman_rig' },
  },
  engineer: {
    unlocked: ['overcharge', 'mend_field', 'overclock'],
    loadout: L(['overcharge', 'mend_field'], null, 'overclock', null),
    gear: { weapon: 'dynamo_wrench', armor: 'tool_harness', accessory: 'dynamo_core' },
  },
}

function makeChar(id: string, job: BaseJob, level: number, kitted: boolean): Character {
  const src = kitted ? KIT[job] : FRESH[job]
  return {
    id, name: id, job, level, xp: 0, jp: 0,
    unlockedJobs: ['soldier', 'gunner', 'engineer'] as JobId[],
    unlocked: [...src.unlocked],
    loadout: src.loadout,
    equipment: kitted ? KIT[job].gear : {},
  }
}

function party(level: number, kitted: boolean): Character[] {
  return [
    makeChar('c1', 'soldier', level, kitted),
    makeChar('c2', 'gunner', level, kitted),
    makeChar('c3', 'engineer', level, kitted),
  ]
}

function simulate(crew: Character[], territoryId: string): 'won' | 'lost' {
  const territory = createInitialState().territories[territoryId]
  let s: BattleState = createBattle(buildWorldBattle(crew, territory))
  let guard = 0
  while (s.phase === 'in-progress' && guard < 3000) {
    const id = s.activeUnitId
    if (!id) break
    s = runEnemyTurn(s, id)
    guard++
  }
  return s.phase === 'won' ? 'won' : 'lost'
}

describe('balance: difficulty curve', () => {
  it('a fresh level-1 crew can take the inner and mid rings', () => {
    expect(simulate(party(1, false), 'cinder-flats')).toBe('won') // tier 1
    expect(simulate(party(1, false), 'old-foundry')).toBe('won') // tier 1
    expect(simulate(party(1, false), 'quartz-hollow')).toBe('won') // tier 2
  })

  it('the quartz depths turn back an unprepared crew', () => {
    expect(simulate(party(1, false), 'glass-hollow')).toBe('lost') // tier 3 quartz
    expect(simulate(party(1, false), 'glass-spire')).toBe('lost') // tier 5 quartz
  })

  it('leveling breaks through the depths', () => {
    expect(simulate(party(4, false), 'glass-hollow')).toBe('won') // tier 3 by level 4
    expect(simulate(party(8, false), 'glass-spire')).toBe('won') // tier 5 by level 8
  })

  it('a fully kitted crew clears the final Crucible', () => {
    expect(simulate(party(8, true), 'the-crucible')).toBe('won')
    expect(simulate(party(8, true), 'glass-spire')).toBe('won')
  })
})
