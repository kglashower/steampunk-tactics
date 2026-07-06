import { BASE_PRODUCTION } from '../../data/resources'
import type { GameState, ResourceType } from '../../types'
import { territoryAttackProbability } from './attackProbability'
import { garrisonPower, incursionPower } from './balance'

export interface IncursionOutcome {
  territoryId: string
  /** Was there a garrison to defend? */
  defended: boolean
  /** Did the territory hold (only meaningful when defended)? */
  held: boolean
}

export interface TurnSummary {
  produced: Partial<Record<ResourceType, number>>
  incursions: IncursionOutcome[]
  newlyOverrun: string[]
}

/**
 * Resolve an end-of-day: produce resources, advance the turn, and roll for
 * monster incursions on each exposed territory. Garrisoned territories
 * auto-resolve by power comparison; undefended ones are overrun outright.
 *
 * Pure: returns a new game state and a summary. Randomness is injected via
 * `rng` (a 0..1 source) so it can be tested deterministically.
 */
export function resolveEndTurn(
  game: GameState,
  rng: () => number,
): { game: GameState; summary: TurnSummary } {
  const next: GameState = structuredClone(game)
  const produced: Partial<Record<ResourceType, number>> = {}

  // 1. Production from owned, active territories.
  for (const t of Object.values(next.territories)) {
    if (t.owner === 'player' && !t.overrun) {
      next.resources[t.resource] += BASE_PRODUCTION
      produced[t.resource] = (produced[t.resource] ?? 0) + BASE_PRODUCTION
    }
  }

  next.turn += 1

  // 2. Incursion rolls. Probabilities use the turn's starting state, so a
  //    territory that falls this turn doesn't cascade onto its neighbors until
  //    next turn. Overruns are collected first, then applied.
  const incursions: IncursionOutcome[] = []
  const newlyOverrun: string[] = []
  for (const t of Object.values(next.territories)) {
    if (t.owner !== 'player' || t.overrun) continue
    const p = territoryAttackProbability(next, t)
    if (p <= 0) continue
    if (rng() >= p) continue // no attack this turn

    if (t.garrison.length > 0) {
      const held = garrisonPower(next, t) >= incursionPower(t)
      incursions.push({ territoryId: t.id, defended: true, held })
      if (!held) newlyOverrun.push(t.id)
    } else {
      incursions.push({ territoryId: t.id, defended: false, held: false })
      newlyOverrun.push(t.id)
    }
  }
  for (const id of newlyOverrun) next.territories[id].overrun = true

  return { game: next, summary: { produced, incursions, newlyOverrun } }
}
