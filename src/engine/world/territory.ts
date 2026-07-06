import type { Character, GameState } from '../../types'

/** Ids of every character currently stationed in any garrison. */
export function garrisonedIds(game: GameState): Set<string> {
  const ids = new Set<string>()
  for (const t of Object.values(game.territories)) {
    for (const id of t.garrison) ids.add(id)
  }
  return ids
}

/** The territory id where a character is garrisoned, or null. */
export function garrisonLocation(game: GameState, charId: string): string | null {
  for (const t of Object.values(game.territories)) {
    if (t.garrison.includes(charId)) return t.id
  }
  return null
}

/** Roster characters available to form an attacking party (not garrisoned). */
export function availableParty(game: GameState): Character[] {
  const garrisoned = garrisonedIds(game)
  return Object.values(game.roster).filter((c) => !garrisoned.has(c.id))
}

/**
 * Can the player launch an attack on this territory?
 *
 * - An overrun holding (still yours) can always be recaptured — no staging
 *   requirement — so a run can never soft-lock when territories fall.
 * - A wild territory can be claimed only if the player owns a healthy
 *   (non-overrun) territory adjacent to it to stage the expansion from.
 */
export function isAttackable(game: GameState, territoryId: string): boolean {
  const t = game.territories[territoryId]
  if (!t) return false
  if (t.owner === 'player' && t.overrun) return true
  if (t.owner !== 'wild') return false
  return t.adjacency.some((nid) => {
    const n = game.territories[nid]
    return n && n.owner === 'player' && !n.overrun
  })
}
