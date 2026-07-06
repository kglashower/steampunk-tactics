import { MONSTER_FAMILIES, MONSTER_TEMPLATES } from '../../data/units'
import type { GameState, Territory } from '../../types'
import { characterStats } from '../economy/equipment'

// Pack composition by territory tier, as indices into a family's [light, mid,
// heavy] tier list. Higher tiers field bigger, heavier packs.
const TIER_COMPOSITION: Record<number, number[]> = {
  0: [0, 0],
  1: [0, 0, 1],
  2: [0, 0, 1, 1],
  3: [0, 1, 1, 2],
  4: [1, 1, 2, 2],
  5: [1, 2, 2, 2],
}

/**
 * The monster force you fight when attacking (or recapturing) a territory.
 * The family is set by the territory's biome; strength scales with its tier.
 */
export function attackForce(territory: Territory): string[] {
  const family = MONSTER_FAMILIES[territory.type]
  const comp = TIER_COMPOSITION[territory.tier] ?? TIER_COMPOSITION[1]
  return comp.map((tierIndex) => family.tiers[tierIndex])
}

function monsterPower(key: string): number {
  const m = MONSTER_TEMPLATES[key]
  if (!m) return 0
  return m.attack + m.defense + m.maxHp * 0.2
}

/** Aggregate strength of an incursion against a garrisoned territory. */
export function incursionPower(territory: Territory): number {
  return attackForce(territory).reduce((sum, k) => sum + monsterPower(k), 0)
}

/** Aggregate strength of the characters stationed at a territory. */
export function garrisonPower(game: GameState, territory: Territory): number {
  return territory.garrison.reduce((sum, id) => {
    const ch = game.roster[id]
    if (!ch) return sum
    const s = characterStats(ch) // includes equipped gear
    return sum + (s.attack + s.defense + s.maxHp * 0.2) * ch.level
  }, 0)
}
