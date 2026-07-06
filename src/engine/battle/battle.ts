import {
  applyDamage,
  getAbility,
  inRange,
  isValidTargetUnit,
  type AbilityTarget,
} from './abilities'
import { computeDamage } from './combat'
import { samePos } from './grid'
import { canMoveTo } from './pathfinding'
import { advanceTurn, activeUnits } from './turnOrder'
import {
  CT_THRESHOLD,
  type BattleEvent,
  type BattleGrid,
  type BattleState,
  type BattleUnit,
  type Position,
} from './types'

/** Input shape for creating a unit (sane defaults filled in). */
export interface UnitSpec {
  id: string
  name: string
  team: BattleUnit['team']
  job?: BattleUnit['job']
  sprite?: string
  pos: Position
  abilities: string[]
  reaction?: string
  stats: BattleUnit['stats']
  /** Optional starting CT (defaults 0). */
  ct?: number
}

export interface BattleConfig {
  grid: BattleGrid
  units: UnitSpec[]
}

function makeUnit(spec: UnitSpec): BattleUnit {
  return {
    id: spec.id,
    name: spec.name,
    team: spec.team,
    job: spec.job,
    sprite: spec.sprite,
    pos: spec.pos,
    stats: spec.stats,
    abilities: spec.abilities,
    reaction: spec.reaction,
    buffs: [],
    ct: spec.ct ?? 0,
    status: 'active',
    hasMoved: false,
    hasActed: false,
  }
}

function log(state: BattleState, text: string, kind: BattleEvent['kind'] = 'info'): void {
  state.log.push({ text, kind })
}

export function createBattle(config: BattleConfig): BattleState {
  const units: Record<string, BattleUnit> = {}
  for (const spec of config.units) units[spec.id] = makeUnit(spec)

  const base: BattleState = {
    grid: config.grid,
    units,
    activeUnitId: null,
    phase: 'in-progress',
    round: 0,
    log: [{ text: 'Battle begins.', kind: 'info' }],
  }

  // Resolve the first turn.
  return advanceTurn(base)
}

export function getActiveUnit(state: BattleState): BattleUnit | null {
  return state.activeUnitId ? state.units[state.activeUnitId] ?? null : null
}

function requireActive(state: BattleState, unitId: string): BattleUnit {
  if (state.phase !== 'in-progress') throw new Error('Battle is over.')
  if (state.activeUnitId !== unitId) throw new Error(`Not ${unitId}'s turn.`)
  const unit = state.units[unitId]
  if (!unit || unit.status !== 'active') throw new Error(`Unit ${unitId} cannot act.`)
  return unit
}

/** Move the active unit to a reachable tile. */
export function moveUnit(state: BattleState, unitId: string, target: Position): BattleState {
  const unit = requireActive(state, unitId)
  if (unit.hasMoved) throw new Error('Already moved this turn.')
  if (!canMoveTo(state, unit, target)) throw new Error('Tile not reachable.')

  const s: BattleState = structuredClone(state)
  const u = s.units[unitId]
  u.pos = target
  u.hasMoved = true
  log(s, `${u.name} moves.`, 'move')
  return s
}

/** Update phase to won/lost if a team has been wiped out. */
export function checkVictory(state: BattleState): BattleState {
  const playersLeft = activeUnits(state).some((u) => u.team === 'player')
  const enemiesLeft = activeUnits(state).some((u) => u.team === 'enemy')
  const s = state
  if (!enemiesLeft) {
    s.phase = 'won'
  } else if (!playersLeft) {
    s.phase = 'lost'
  }
  return s
}

/** Use an ability with the active unit. */
export function useAbility(
  state: BattleState,
  unitId: string,
  abilityId: string,
  target: AbilityTarget,
): BattleState {
  const unit = requireActive(state, unitId)
  if (unit.hasActed) throw new Error('Already acted this turn.')

  const def = getAbility(abilityId)
  if (!unit.abilities.includes(abilityId)) throw new Error(`${unit.name} lacks ${abilityId}.`)
  if (unit.stats.steam < def.steamCost) throw new Error('Not enough Steam.')

  // Validate target.
  if (def.targetType === 'self') {
    target = { unitId }
  } else if (def.targetType === 'tile') {
    if (!target.pos) throw new Error('Ability needs a target tile.')
    if (!inRange(unit, def, target.pos)) throw new Error('Target out of range.')
  } else {
    const t = target.unitId ? state.units[target.unitId] : undefined
    if (!t) throw new Error('Ability needs a target unit.')
    if (!isValidTargetUnit(unit, def, t)) throw new Error('Invalid target.')
    if (!inRange(unit, def, t.pos)) throw new Error('Target out of range.')
  }

  const s: BattleState = structuredClone(state)
  const caster = s.units[unitId]
  // Snapshot HP so we can report exactly what the action (and any counter) did.
  const beforeHp: Record<string, number> = {}
  for (const u of Object.values(s.units)) beforeHp[u.id] = u.stats.hp

  caster.stats.steam -= def.steamCost
  def.resolve(s, caster, target)
  caster.hasActed = true

  // Counter reaction: a melee attack that leaves an adjacent foe standing draws
  // a riposte from any foe with Counter slotted.
  const counterers: string[] = []
  if (def.kind === 'attack' && def.range <= 1) {
    for (const u of activeUnits(s)) {
      if (u.team === caster.team || u.reaction !== 'counter') continue
      if (isAdjacent(u.pos, caster.pos) && caster.status === 'active') {
        applyDamage(caster, computeDamage(s.grid, u, caster, 0))
        counterers.push(u.name)
      }
    }
  }

  // Combat feed: the action, any counters, then per-unit HP deltas.
  log(s, `${caster.name} — ${def.name}`, 'action')
  for (const cn of counterers) log(s, `${cn} counters!`, 'action')
  for (const u of Object.values(s.units)) {
    const delta = u.stats.hp - beforeHp[u.id]
    if (delta < 0) {
      const ko = u.status === 'ko'
      log(s, `${u.name} −${-delta} HP${ko ? ' — downed!' : ''}`, ko ? 'ko' : 'damage')
    } else if (delta > 0) {
      log(s, `${u.name} +${delta} HP`, 'heal')
    }
  }

  return checkVictory(s)
}

/**
 * End the active unit's turn: spend its accumulated CT (carrying the remainder)
 * and advance to the next unit.
 */
export function endTurn(state: BattleState, unitId: string): BattleState {
  const unit = requireActive(state, unitId)
  const s: BattleState = structuredClone(state)
  s.units[unit.id].ct -= CT_THRESHOLD
  if (s.phase !== 'in-progress') return s
  return advanceTurn(s)
}

/** True if `a` is standing adjacent (orthogonally) to position `b`. */
export function isAdjacent(a: Position, b: Position): boolean {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y) === 1
}

export { samePos }
