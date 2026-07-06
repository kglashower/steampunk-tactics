import type { GameState, Territory } from '../../types'

/** Default base attack rate (tunable). See docs/mvp-design.md §5. */
export const BASE_ATTACK_RATE = 0.2

/**
 * Probability that an owned territory is attacked by monsters this turn.
 *
 *   P = baseRate * (wildNeighbors / totalNeighbors)
 *
 * Core design rule: if no adjacent territory is wild, P = 0 (a territory fully
 * surrounded by player-owned land is safe).
 *
 * Pure function — no randomness here. The actual roll happens elsewhere so this
 * stays deterministic and testable.
 */
export function attackProbability(
  wildNeighbors: number,
  totalNeighbors: number,
  baseRate: number = BASE_ATTACK_RATE,
): number {
  if (totalNeighbors <= 0) return 0
  if (wildNeighbors <= 0) return 0
  return baseRate * (wildNeighbors / totalNeighbors)
}

/**
 * How many of a territory's neighbors threaten it: those not owned by the player,
 * plus owned-but-overrun ones (an infested territory menaces its neighbors).
 */
export function countWildNeighbors(state: GameState, territory: Territory): number {
  return territory.adjacency.filter((id) => {
    const neighbor = state.territories[id]
    return !neighbor || neighbor.owner !== 'player' || neighbor.overrun
  }).length
}

/** Convenience: attack probability for a specific territory in a game state. */
export function territoryAttackProbability(
  state: GameState,
  territory: Territory,
  baseRate: number = BASE_ATTACK_RATE,
): number {
  if (territory.owner !== 'player') return 0
  const wild = countWildNeighbors(state, territory)
  return attackProbability(wild, territory.adjacency.length, baseRate)
}
