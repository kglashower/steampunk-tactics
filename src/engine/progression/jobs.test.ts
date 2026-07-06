import { describe, expect, it } from 'vitest'
import { createInitialState } from '../../data/initialState'
import {
  canUnlockJob,
  characterActions,
  characterReaction,
  jobUnlockBlocker,
  jobVisible,
  learnAbility,
  learnBlocker,
  setLoadout,
  switchJob,
  unlockJob,
} from './jobs'

describe('learning abilities', () => {
  it('blocks without JP, succeeds once affordable', () => {
    const g = createInitialState()
    // Brannock (soldier) — learn Bulwark (100 JP).
    expect(learnBlocker(g.roster.c1, 'bulwark')).toMatch(/JP/)
    g.roster.c1.jp = 100
    const after = learnAbility(g, 'c1', 'bulwark')
    expect(after.roster.c1.unlocked).toContain('bulwark')
    expect(after.roster.c1.jp).toBe(0)
  })

  it('only offers abilities from unlocked jobs', () => {
    const g = createInitialState()
    g.roster.c1.jp = 999
    // jump_attack is a Dragoon ability; Brannock hasn't unlocked Dragoon.
    expect(learnBlocker(g.roster.c1, 'jump_attack')).toMatch(/Not offered/)
  })
})

describe('job tree', () => {
  it('gates a tier-2 job behind abilities + JP, then unlocks it', () => {
    const g = createInitialState()
    g.roster.c1.jp = 999
    // Needs 2 abilities learned from Soldier first.
    expect(jobUnlockBlocker(g.roster.c1, 'dragoon')).toMatch(/Learn 2/)
    g.roster.c1.unlocked = ['power_strike', 'bulwark']
    expect(canUnlockJob(g.roster.c1, 'dragoon')).toBe(true)
    const after = unlockJob(g, 'c1', 'dragoon')
    expect(after.roster.c1.unlockedJobs).toContain('dragoon')
    expect(after.roster.c1.jp).toBe(999 - 250)
  })

  it('hides jobs whose prerequisites are unmet, reveals them when met', () => {
    const g = createInitialState()
    // Warlord needs Dragoon + Sentinel — hidden at start.
    expect(jobVisible(g.roster.c1, 'warlord')).toBe(false)
    // Dragoon is visible (its prereq Soldier is a root, unlocked).
    expect(jobVisible(g.roster.c1, 'dragoon')).toBe(true)
    g.roster.c1.unlockedJobs.push('dragoon', 'sentinel')
    expect(jobVisible(g.roster.c1, 'warlord')).toBe(true)
  })

  it('switches only to an unlocked job', () => {
    const g = createInitialState()
    expect(switchJob(g, 'c1', 'dragoon').roster.c1.job).toBe('soldier') // not unlocked
    expect(switchJob(g, 'c1', 'gunner').roster.c1.job).toBe('gunner') // root, unlocked
  })
})

describe('loadout & battle derivation', () => {
  it('slots actions and reflects them in the battle action menu', () => {
    const g = createInitialState()
    g.roster.c1.unlocked = ['power_strike', 'bulwark']
    let after = setLoadout(g, 'c1', 'action0', 'power_strike')
    after = setLoadout(after, 'c1', 'action1', 'bulwark')
    const actions = characterActions(after.roster.c1)
    expect(actions).toEqual(expect.arrayContaining(['strike', 'power_strike', 'bulwark', 'wait']))
  })

  it('rejects slotting an ability into the wrong category', () => {
    const g = createInitialState()
    g.roster.c1.unlocked = ['toughness'] // a passive
    const after = setLoadout(g, 'c1', 'action0', 'toughness')
    expect(after.roster.c1.loadout.actions[0]).not.toBe('toughness')
  })

  it('exposes a slotted reaction', () => {
    const g = createInitialState()
    g.roster.c1.unlocked = ['guard']
    const after = setLoadout(g, 'c1', 'reaction', 'guard')
    expect(characterReaction(after.roster.c1)).toBe('guard')
  })
})
