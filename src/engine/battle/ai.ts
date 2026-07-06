import { getAbility, type AbilityDef } from './abilities'
import { endTurn, moveUnit, useAbility } from './battle'
import { computeHeal, effectiveAttack, effectiveDefense, heightBonus } from './combat'
import { manhattan, samePos } from './grid'
import { reachableTiles } from './pathfinding'
import { activeUnits } from './turnOrder'
import type { BattleState, BattleUnit, Position } from './types'

/** Abilities whose secondary debuff is worth a small scoring bonus. */
const DEBUFF_ABILITIES = new Set(['suppress', 'shield_breaker', 'emp_blast'])

const KILL_BONUS = 50
const DEBUFF_BONUS = 6
const REVIVE_VALUE = 45
const MOVE_PENALTY = 0.05
/** A buff is only worth casting if a foe is within this range of the caster. */
const ENGAGE_RANGE = 8

function abilityDamage(
  state: BattleState,
  ab: AbilityDef,
  attacker: BattleUnit,
  fromTile: Position,
  defender: BattleUnit,
): number {
  const base = ab.damageStat === 'tech' ? attacker.stats.tech : effectiveAttack(attacker)
  const raw = base + ab.power + heightBonus(state.grid, fromTile, defender.pos) - effectiveDefense(defender)
  return Math.max(1, raw)
}

function unitsInRadius(
  state: BattleState,
  center: Position,
  area: number,
  pred: (u: BattleUnit) => boolean,
  includeKO: boolean,
): BattleUnit[] {
  return Object.values(state.units).filter(
    (u) => (includeKO || u.status === 'active') && manhattan(u.pos, center) <= area && pred(u),
  )
}

/** Units an ability would affect if cast from `tile` at `target`. */
function affectedUnits(
  state: BattleState,
  unit: BattleUnit,
  tile: Position,
  ab: AbilityDef,
  target: BattleUnit,
): BattleUnit[] {
  const side = ab.kind === 'attack' ? 'enemy' : 'ally'
  const pred = (u: BattleUnit) => (side === 'enemy' ? u.team !== unit.team : u.team === unit.team)
  if (ab.area != null) {
    const center = ab.targetType === 'self' ? tile : target.pos
    return unitsInRadius(state, center, ab.area, pred, ab.kind === 'repair')
  }
  return [target]
}

interface Plan {
  tile: Position
  ab: AbilityDef
  target: BattleUnit
  score: number
}

function scorePlan(state: BattleState, unit: BattleUnit, tile: Position, ab: AbilityDef, target: BattleUnit): number {
  const movePenalty = manhattan(unit.pos, tile) * MOVE_PENALTY
  const affected = affectedUnits(state, unit, tile, ab, target)

  if (ab.kind === 'attack') {
    if (affected.length === 0) return -Infinity
    let score = 0
    for (const t of affected) {
      const dmg = abilityDamage(state, ab, unit, tile, t)
      score += Math.min(dmg, t.stats.hp) // effective damage (no overkill credit)
      if (dmg >= t.stats.hp) score += KILL_BONUS
      if (DEBUFF_ABILITIES.has(ab.id)) score += DEBUFF_BONUS
    }
    return score - movePenalty
  }

  if (ab.kind === 'repair') {
    let value = 0
    for (const t of affected) {
      if (t.status === 'ko') value += REVIVE_VALUE
      else value += Math.min(computeHeal(unit, ab.power), t.stats.maxHp - t.stats.hp)
    }
    if (value <= 0) return -Infinity // don't waste a heal on healthy allies
    return value - movePenalty
  }

  if (ab.kind === 'buff') {
    const foeNear = activeUnits(state).some((u) => u.team !== unit.team && manhattan(u.pos, tile) <= ENGAGE_RANGE)
    if (!foeNear) return -Infinity
    return (ab.aiValue ?? 4) * Math.max(1, affected.length) - movePenalty
  }

  return -Infinity
}

/** Enumerate every (tile, ability, target) the unit could do this turn. */
function enumeratePlans(state: BattleState, unit: BattleUnit): Plan[] {
  const tiles = [unit.pos, ...reachableTiles(state, unit)]
  const abilities = unit.abilities.map(getAbility).filter((a) => a.id !== 'wait')
  const sameTeam = Object.values(state.units).filter((u) => u.team === unit.team)
  const foes = activeUnits(state).filter((u) => u.team !== unit.team)
  const plans: Plan[] = []

  for (const tile of tiles) {
    for (const ab of abilities) {
      if (unit.stats.steam < ab.steamCost) continue
      const inRange = (p: Position) => manhattan(tile, p) <= ab.range
      let candidates: BattleUnit[]
      switch (ab.targetType) {
        case 'self':
          candidates = [unit]
          break
        case 'enemy':
          candidates = foes.filter((f) => inRange(f.pos))
          break
        case 'ally':
          candidates = sameTeam.filter((a) => a.status === 'active' && inRange(a.pos))
          break
        case 'ally-or-ko':
          candidates = sameTeam.filter((a) => inRange(a.pos))
          break
        default:
          candidates = []
      }
      for (const target of candidates) {
        const score = scorePlan(state, unit, tile, ab, target)
        if (score > -Infinity) plans.push({ tile, ab, target, score })
      }
    }
  }
  return plans
}

/**
 * Run one unit's full turn (move + act + end) with ability-aware utility
 * scoring: attacks (incl. AoE/debuffs), heals/revives, and buffs are all
 * weighed, and the best is taken. With nothing useful in reach, advance toward
 * the nearest foe. Pure: returns new state.
 */
export function runEnemyTurn(state: BattleState, unitId: string): BattleState {
  let s = state
  const unit = s.units[unitId]
  const foes = activeUnits(s).filter((u) => u.team !== unit.team)
  if (foes.length === 0) return endTurn(s, unitId)

  const plans = enumeratePlans(s, unit)
  const best = plans.reduce<Plan | null>((b, p) => (b === null || p.score > b.score ? p : b), null)

  if (best && best.score > 0) {
    if (!samePos(best.tile, unit.pos)) s = moveUnit(s, unitId, best.tile)
    const target = best.ab.targetType === 'self' ? {} : { unitId: best.target.id }
    s = useAbility(s, unitId, best.ab.id, target)
    return s.phase === 'in-progress' ? endTurn(s, unitId) : s
  }

  // Nothing useful in reach: step toward the nearest foe.
  const nearest = foes.slice().sort((a, b) => manhattan(unit.pos, a.pos) - manhattan(unit.pos, b.pos))[0]
  let bestTile = unit.pos
  let bestDist = manhattan(unit.pos, nearest.pos)
  for (const tile of reachableTiles(s, unit)) {
    const d = manhattan(tile, nearest.pos)
    if (d < bestDist) {
      bestDist = d
      bestTile = tile
    }
  }
  if (!samePos(bestTile, unit.pos)) s = moveUnit(s, unitId, bestTile)
  return endTurn(s, unitId)
}
