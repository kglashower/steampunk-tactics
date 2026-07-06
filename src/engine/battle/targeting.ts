import { inRange, isValidTargetUnit, type AbilityDef } from './abilities'
import type { BattleState, BattleUnit, Position } from './types'

function key(p: Position): string {
  return `${p.x},${p.y}`
}

/**
 * Position-keys of all tiles a caster could legally target with an ability,
 * for highlighting. For unit-targeted abilities these are the tiles of valid
 * target units; for self abilities, the caster's own tile.
 */
export function abilityTargetKeys(
  state: BattleState,
  caster: BattleUnit,
  def: AbilityDef,
): Set<string> {
  const keys = new Set<string>()
  if (def.targetType === 'self') {
    keys.add(key(caster.pos))
    return keys
  }
  for (const u of Object.values(state.units)) {
    if (isValidTargetUnit(caster, def, u) && inRange(caster, def, u.pos)) {
      keys.add(key(u.pos))
    }
  }
  return keys
}

/** The targetable unit standing on a tile for this ability, if any. */
export function targetUnitAt(
  state: BattleState,
  caster: BattleUnit,
  def: AbilityDef,
  pos: Position,
): BattleUnit | undefined {
  if (def.targetType === 'self') return caster
  return Object.values(state.units).find(
    (u) =>
      u.pos.x === pos.x &&
      u.pos.y === pos.y &&
      isValidTargetUnit(caster, def, u) &&
      inRange(caster, def, u.pos),
  )
}
