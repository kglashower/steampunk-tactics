import { effectiveSpeed } from './combat'
import { CT_THRESHOLD, type BattleState, type BattleUnit } from './types'

export function activeUnits(state: BattleState): BattleUnit[] {
  return Object.values(state.units).filter((u) => u.status === 'active')
}

/**
 * Deterministic ordering for "who acts next" once CT is built up.
 * Higher CT first, then higher Speed, then id for a stable tie-break.
 */
function turnPriority(a: BattleUnit, b: BattleUnit): number {
  return b.ct - a.ct || effectiveSpeed(b) - effectiveSpeed(a) || a.id.localeCompare(b.id)
}

/**
 * Fast-forward Charge Time until a unit is ready, make it the active unit, and
 * run its start-of-turn bookkeeping (reset action flags, tick buffs, regen
 * Steam). Pure: returns a new state.
 */
export function advanceTurn(state: BattleState): BattleState {
  const s: BattleState = structuredClone(state)
  const ready = () => activeUnits(s).filter((u) => u.ct >= CT_THRESHOLD)

  let guard = 0
  while (activeUnits(s).length > 0 && ready().length === 0) {
    for (const u of activeUnits(s)) u.ct += effectiveSpeed(u)
    if (++guard > 100000) break // safety against a 0-speed deadlock
  }

  const candidates = ready()
  if (candidates.length === 0) {
    s.activeUnitId = null
    return s
  }

  const next = candidates.sort(turnPriority)[0]
  s.activeUnitId = next.id
  s.round += 1

  // Start-of-turn bookkeeping.
  next.hasMoved = false
  next.hasActed = false
  next.buffs = next.buffs
    .map((b) => ({ ...b, turns: b.turns - 1 }))
    .filter((b) => b.turns > 0)
  next.stats.steam = Math.min(next.stats.maxSteam, next.stats.steam + next.stats.steamRegen)

  return s
}

/**
 * Predict the next `count` units to act (including the current active unit
 * first), assuming each takes a full turn. Used for the turn-order HUD.
 * Does not mutate state.
 */
export function forecastTurns(state: BattleState, count: number): string[] {
  const units = activeUnits(state).map((u) => ({ id: u.id, ct: u.ct, speed: effectiveSpeed(u) }))
  if (units.length === 0) return []

  const order: string[] = []
  let guard = 0
  while (order.length < count && guard < 100000) {
    while (!units.some((u) => u.ct >= CT_THRESHOLD)) {
      for (const u of units) u.ct += u.speed
      if (++guard > 100000) break
    }
    const next = units
      .filter((u) => u.ct >= CT_THRESHOLD)
      .sort((a, b) => b.ct - a.ct || b.speed - a.speed || a.id.localeCompare(b.id))[0]
    if (!next) break
    order.push(next.id)
    next.ct -= CT_THRESHOLD
    guard++
  }
  return order
}
