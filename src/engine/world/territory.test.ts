import { describe, expect, it } from 'vitest'
import { createInitialState } from '../../data/initialState'
import { availableParty, garrisonLocation, isAttackable } from './territory'

describe('isAttackable', () => {
  it('allows attacking a wild territory adjacent to an owned one', () => {
    const game = createInitialState()
    expect(isAttackable(game, 'cinder-flats')).toBe(true)
    expect(isAttackable(game, 'verdigris-mesa')).toBe(true)
  })

  it('does not allow attacking your own healthy territory', () => {
    expect(isAttackable(createInitialState(), 'ironhold')).toBe(false)
  })

  it('blocks far territories with no owned staging neighbor', () => {
    const game = createInitialState()
    // Ashfields borders only the (still wild) Cinder Flats and Old Foundry.
    expect(isAttackable(game, 'ashfields')).toBe(false)
  })

  it('opens up once a staging neighbor is owned', () => {
    const game = createInitialState()
    game.territories['cinder-flats'].owner = 'player'
    expect(isAttackable(game, 'ashfields')).toBe(true)
  })

  it('allows recapturing an overrun holding', () => {
    const game = createInitialState()
    game.territories['cinder-flats'].owner = 'player'
    game.territories['cinder-flats'].overrun = true
    expect(isAttackable(game, 'cinder-flats')).toBe(true)
  })

  it('can always recapture an overrun holding, even with no healthy neighbor (no soft-lock)', () => {
    const game = createInitialState()
    // Ironhold overrun and both neighbors wild: still recapturable.
    game.territories.ironhold.overrun = true
    expect(isAttackable(game, 'ironhold')).toBe(true)
  })
})

describe('party availability', () => {
  it('lists all roster members when none are garrisoned', () => {
    expect(availableParty(createInitialState())).toHaveLength(3)
  })

  it('excludes garrisoned members and locates them', () => {
    const game = createInitialState()
    game.territories.ironhold.garrison = ['c1']
    expect(availableParty(game).map((c) => c.id)).toEqual(['c2', 'c3'])
    expect(garrisonLocation(game, 'c1')).toBe('ironhold')
    expect(garrisonLocation(game, 'c2')).toBeNull()
  })
})
