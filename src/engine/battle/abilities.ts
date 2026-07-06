import { computeDamage, computeHeal, effectiveDefense, guardReduction, heightBonus } from './combat'
import { heightAt, inBounds, isOccupied, manhattan } from './grid'
import type { BattleState, BattleUnit, Position } from './types'
import type { AbilitySlot } from '../../types'

export type TargetType = 'enemy' | 'ally' | 'ally-or-ko' | 'self' | 'tile'

export interface AbilityTarget {
  unitId?: string
  pos?: Position
}

/** Stat bonuses granted by a slotted passive ability. */
export interface PassiveMods {
  attack?: number
  defense?: number
  maxHp?: number
  maxSteam?: number
  tech?: number
  steamRegen?: number
}

/** Movement modifiers granted by a slotted movement ability. */
export interface MoveMods {
  move?: number
  jump?: number
  hover?: boolean
}

export interface AbilityDef {
  id: string
  name: string
  kind: 'attack' | 'repair' | 'buff' | 'wait' | 'reaction' | 'passive' | 'movement'
  /** Which loadout slot this ability occupies (default 'action'). */
  slot?: AbilitySlot
  steamCost: number
  /** Max Manhattan range (1 = melee). Ignored for self. */
  range: number
  targetType: TargetType
  power: number
  /** Splash radius (Manhattan) for AoE abilities; omitted = single target. */
  area?: number
  /** Which stat scales damage (default 'attack'). Gadgets use 'tech'. */
  damageStat?: 'attack' | 'tech'
  /** Heuristic value used by the AI for non-damage abilities (buffs). */
  aiValue?: number
  /** Passive stat bonuses (slot 'passive'). */
  passiveMods?: PassiveMods
  /** Movement modifiers (slot 'movement'). */
  moveMods?: MoveMods
  /** Reaction behavior (slot 'reaction'). */
  reaction?: 'guard' | 'counter'
  description: string
  /** Apply the effect. `state` is a working copy that may be mutated freely. */
  resolve: (state: BattleState, caster: BattleUnit, target: AbilityTarget) => void
}

/** The slot an ability occupies (defaults to 'action'). */
export function abilitySlot(def: AbilityDef): AbilitySlot {
  return def.slot ?? 'action'
}

// --- mutation helpers -------------------------------------------------------

export function applyDamage(unit: BattleUnit, amount: number): void {
  unit.stats.hp = Math.max(0, unit.stats.hp - amount)
  if (unit.stats.hp === 0) unit.status = 'ko'
}

function healUnit(unit: BattleUnit, amount: number): void {
  const wasKO = unit.status === 'ko'
  unit.status = 'active'
  unit.stats.hp = Math.min(unit.stats.maxHp, (wasKO ? 0 : unit.stats.hp) + amount)
}

function pushAway(state: BattleState, from: Position, target: BattleUnit): void {
  const dx = Math.sign(target.pos.x - from.x)
  const dy = Math.sign(target.pos.y - from.y)
  const dest: Position = { x: target.pos.x + dx, y: target.pos.y + dy }
  if (!inBounds(state.grid, dest)) return
  if (isOccupied(state, dest)) return
  // Knockback ignores jump limits (it's a shove), but stays in bounds/empty.
  target.pos = dest
}

function targetUnit(state: BattleState, target: AbilityTarget): BattleUnit | undefined {
  return target.unitId ? state.units[target.unitId] : undefined
}

/** Active units within `area` (Manhattan) of a center tile, matching a predicate. */
function unitsInArea(
  state: BattleState,
  center: Position,
  area: number,
  pred: (u: BattleUnit) => boolean,
): BattleUnit[] {
  return Object.values(state.units).filter(
    (u) => u.status === 'active' && manhattan(u.pos, center) <= area && pred(u),
  )
}

/** Tech-scaling gadget damage (Engineer abilities). */
function techDamage(state: BattleState, caster: BattleUnit, target: BattleUnit, power: number): number {
  const raw =
    caster.stats.tech + power + heightBonus(state.grid, caster.pos, target.pos) - effectiveDefense(target) - guardReduction(target)
  return Math.max(1, raw)
}

const isEnemyOf = (caster: BattleUnit) => (u: BattleUnit) => u.team !== caster.team
const isAllyOf = (caster: BattleUnit) => (u: BattleUnit) => u.team === caster.team

// --- ability definitions ----------------------------------------------------

export const ABILITIES: Record<string, AbilityDef> = {
  wait: {
    id: 'wait',
    name: 'Wait',
    kind: 'wait',
    steamCost: 0,
    range: 0,
    targetType: 'self',
    power: 0,
    description: 'End the turn without acting.',
    resolve: () => {},
  },

  // --- Soldier ---
  strike: {
    id: 'strike',
    name: 'Strike',
    kind: 'attack',
    steamCost: 0,
    range: 1,
    targetType: 'enemy',
    power: 0,
    description: 'A basic melee attack.',
    resolve: (state, caster, target) => {
      const t = targetUnit(state, target)
      if (t) applyDamage(t, computeDamage(state.grid, caster, t, 0))
    },
  },
  bulwark: {
    id: 'bulwark',
    name: 'Bulwark',
    kind: 'buff',
    steamCost: 2,
    range: 0,
    targetType: 'self',
    power: 0,
    aiValue: 6,
    description: 'Brace: +5 Defense until your next turn.',
    resolve: (_state, caster) => {
      caster.buffs.push({ id: 'bulwark', defense: 5, turns: 1 })
    },
  },

  // --- Gunner ---
  shoot: {
    id: 'shoot',
    name: 'Shoot',
    kind: 'attack',
    steamCost: 0,
    range: 4,
    targetType: 'enemy',
    power: 0,
    description: 'A ranged attack; stronger from high ground.',
    resolve: (state, caster, target) => {
      const t = targetUnit(state, target)
      if (t) applyDamage(t, computeDamage(state.grid, caster, t, 0))
    },
  },

  // --- Engineer ---
  wrench_strike: {
    id: 'wrench_strike',
    name: 'Wrench Strike',
    kind: 'attack',
    steamCost: 0,
    range: 1,
    targetType: 'enemy',
    power: -2,
    description: 'A weak melee attack.',
    resolve: (state, caster, target) => {
      const t = targetUnit(state, target)
      if (t) applyDamage(t, computeDamage(state.grid, caster, t, -2))
    },
  },
  field_repair: {
    id: 'field_repair',
    name: 'Field Repair',
    kind: 'repair',
    steamCost: 4,
    range: 3,
    targetType: 'ally-or-ko',
    power: 4,
    description: 'Restore HP to an ally (or revive a downed one). Scales with Tech.',
    resolve: (state, caster, target) => {
      const t = targetUnit(state, target)
      if (t) healUnit(t, computeHeal(caster, 4))
    },
  },

  // === Unlockable job-tree abilities ===

  // --- Soldier ---
  power_strike: {
    id: 'power_strike', name: 'Power Strike', kind: 'attack', steamCost: 3, range: 1, targetType: 'enemy', power: 6,
    description: 'A heavy melee blow.',
    resolve: (state, caster, target) => {
      const t = targetUnit(state, target)
      if (t) applyDamage(t, computeDamage(state.grid, caster, t, 6))
    },
  },
  cleave: {
    id: 'cleave', name: 'Cleave', kind: 'attack', steamCost: 4, range: 0, targetType: 'self', power: 2, area: 1,
    description: 'Strike all enemies adjacent to you.',
    resolve: (state, caster) => {
      for (const e of unitsInArea(state, caster.pos, 1, isEnemyOf(caster))) {
        applyDamage(e, computeDamage(state.grid, caster, e, 2))
      }
    },
  },
  shield_breaker: {
    id: 'shield_breaker', name: 'Shield Breaker', kind: 'attack', steamCost: 4, range: 1, targetType: 'enemy', power: 2,
    description: 'Damage a foe and Expose them (-5 Defense for 2 turns).',
    resolve: (state, caster, target) => {
      const t = targetUnit(state, target)
      if (!t) return
      applyDamage(t, computeDamage(state.grid, caster, t, 2))
      if (t.status === 'active') t.buffs.push({ id: 'expose', defense: -5, turns: 2 })
    },
  },
  rally: {
    id: 'rally', name: 'Rally', kind: 'buff', steamCost: 5, range: 0, targetType: 'self', power: 0, area: 1, aiValue: 8,
    description: 'Inspire yourself and adjacent allies: +4 Attack for 2 turns.',
    resolve: (state, caster) => {
      for (const a of unitsInArea(state, caster.pos, 1, isAllyOf(caster))) {
        a.buffs.push({ id: 'rally', attack: 4, turns: 2 })
      }
    },
  },

  // --- Gunner ---
  aimed_shot: {
    id: 'aimed_shot', name: 'Aimed Shot', kind: 'attack', steamCost: 3, range: 5, targetType: 'enemy', power: 6,
    description: 'A carefully aimed long-range shot.',
    resolve: (state, caster, target) => {
      const t = targetUnit(state, target)
      if (t) applyDamage(t, computeDamage(state.grid, caster, t, 6))
    },
  },
  suppress: {
    id: 'suppress', name: 'Suppress', kind: 'attack', steamCost: 4, range: 4, targetType: 'enemy', power: 0,
    description: 'Damage a foe and Slow them (-6 Speed for 2 turns).',
    resolve: (state, caster, target) => {
      const t = targetUnit(state, target)
      if (!t) return
      applyDamage(t, computeDamage(state.grid, caster, t, 0))
      if (t.status === 'active') t.buffs.push({ id: 'slow', speed: -6, turns: 2 })
    },
  },
  scattershot: {
    id: 'scattershot', name: 'Scattershot', kind: 'attack', steamCost: 5, range: 4, targetType: 'enemy', power: -1, area: 1,
    description: 'A spread that hits the target and nearby foes.',
    resolve: (state, caster, target) => {
      const t = targetUnit(state, target)
      if (!t) return
      for (const e of unitsInArea(state, t.pos, 1, isEnemyOf(caster))) {
        applyDamage(e, computeDamage(state.grid, caster, e, -1))
      }
    },
  },
  deadeye: {
    id: 'deadeye', name: 'Deadeye', kind: 'buff', steamCost: 4, range: 0, targetType: 'self', power: 0, aiValue: 10,
    description: 'Steady your aim: +6 Attack for 2 turns.',
    resolve: (_state, caster) => {
      caster.buffs.push({ id: 'deadeye', attack: 6, turns: 2 })
    },
  },

  // --- Engineer ---
  overcharge: {
    id: 'overcharge', name: 'Overcharge', kind: 'attack', steamCost: 4, range: 3, targetType: 'enemy', power: 2, damageStat: 'tech',
    description: 'A ranged jolt of charge; damage scales with Tech.',
    resolve: (state, caster, target) => {
      const t = targetUnit(state, target)
      if (t) applyDamage(t, techDamage(state, caster, t, 2))
    },
  },
  mend_field: {
    id: 'mend_field', name: 'Mend Field', kind: 'repair', steamCost: 6, range: 0, targetType: 'self', power: 2, area: 1,
    description: 'Repair yourself and adjacent allies. Scales with Tech.',
    resolve: (state, caster) => {
      for (const a of unitsInArea(state, caster.pos, 1, isAllyOf(caster))) {
        healUnit(a, computeHeal(caster, 2))
      }
    },
  },
  emp_blast: {
    id: 'emp_blast', name: 'EMP Blast', kind: 'attack', steamCost: 6, range: 3, targetType: 'enemy', power: 0, area: 1, damageStat: 'tech',
    description: 'A burst that damages and Slows foes around the target.',
    resolve: (state, caster, target) => {
      const t = targetUnit(state, target)
      if (!t) return
      for (const e of unitsInArea(state, t.pos, 1, isEnemyOf(caster))) {
        applyDamage(e, techDamage(state, caster, e, 0))
        if (e.status === 'active') e.buffs.push({ id: 'slow', speed: -4, turns: 2 })
      }
    },
  },
  fortify: {
    id: 'fortify', name: 'Fortify', kind: 'buff', steamCost: 4, range: 3, targetType: 'ally', power: 0, aiValue: 8,
    description: 'Reinforce an ally: +6 Defense for 2 turns.',
    resolve: (state, _caster, target) => {
      const t = targetUnit(state, target)
      if (t) t.buffs.push({ id: 'fortify', defense: 6, turns: 2 })
    },
  },

  // === Advanced-job actions ===
  jump_attack: {
    id: 'jump_attack', name: 'Jump', kind: 'attack', steamCost: 4, range: 2, targetType: 'enemy', power: 6,
    description: 'Leap at a foe up to 2 tiles away for heavy damage.',
    resolve: (state, caster, target) => {
      const t = targetUnit(state, target)
      if (t) applyDamage(t, computeDamage(state.grid, caster, t, 6))
    },
  },
  snipe: {
    id: 'snipe', name: 'Snipe', kind: 'attack', steamCost: 4, range: 7, targetType: 'enemy', power: 8,
    description: 'A precise long-range shot for heavy damage.',
    resolve: (state, caster, target) => {
      const t = targetUnit(state, target)
      if (t) applyDamage(t, computeDamage(state.grid, caster, t, 8))
    },
  },
  frag_grenade: {
    id: 'frag_grenade', name: 'Frag Grenade', kind: 'attack', steamCost: 5, range: 4, targetType: 'enemy', power: 2, area: 1,
    description: 'Lob a grenade that bursts over the target and nearby foes.',
    resolve: (state, caster, target) => {
      const t = targetUnit(state, target)
      if (!t) return
      for (const e of unitsInArea(state, t.pos, 1, isEnemyOf(caster))) {
        applyDamage(e, computeDamage(state.grid, caster, e, 2))
      }
    },
  },
  warcry: {
    id: 'warcry', name: 'War Cry', kind: 'buff', steamCost: 6, range: 0, targetType: 'self', power: 0, area: 2, aiValue: 12,
    description: 'Embolden nearby allies: +4 Attack and +4 Defense for 2 turns.',
    resolve: (state, caster) => {
      for (const a of unitsInArea(state, caster.pos, 2, isAllyOf(caster))) {
        a.buffs.push({ id: 'warcry', attack: 4, defense: 4, turns: 2 })
      }
    },
  },

  // === Reactions (slot 'reaction') ===
  guard: {
    id: 'guard', name: 'Guard', kind: 'reaction', slot: 'reaction', steamCost: 0, range: 0, targetType: 'self', power: 0,
    reaction: 'guard',
    description: 'Reaction: reduce all incoming damage by 4.',
    resolve: () => {},
  },
  counter: {
    id: 'counter', name: 'Counter', kind: 'reaction', slot: 'reaction', steamCost: 0, range: 0, targetType: 'self', power: 0,
    reaction: 'counter',
    description: 'Reaction: strike back when hit by an adjacent melee attacker.',
    resolve: () => {},
  },

  // === Passives (slot 'passive') ===
  toughness: {
    id: 'toughness', name: 'Toughness', kind: 'passive', slot: 'passive', steamCost: 0, range: 0, targetType: 'self', power: 0,
    passiveMods: { maxHp: 10 },
    description: 'Passive: +10 max HP.',
    resolve: () => {},
  },
  focus: {
    id: 'focus', name: 'Focus', kind: 'passive', slot: 'passive', steamCost: 0, range: 0, targetType: 'self', power: 0,
    passiveMods: { attack: 3 },
    description: 'Passive: +3 Attack.',
    resolve: () => {},
  },
  plating: {
    id: 'plating', name: 'Plating', kind: 'passive', slot: 'passive', steamCost: 0, range: 0, targetType: 'self', power: 0,
    passiveMods: { defense: 4 },
    description: 'Passive: +4 Defense.',
    resolve: () => {},
  },
  overclock: {
    id: 'overclock', name: 'Overclock', kind: 'passive', slot: 'passive', steamCost: 0, range: 0, targetType: 'self', power: 0,
    passiveMods: { tech: 4, steamRegen: 1 },
    description: 'Passive: +4 Tech and +1 Steam/turn.',
    resolve: () => {},
  },
  battle_hardened: {
    id: 'battle_hardened', name: 'Battle-Hardened', kind: 'passive', slot: 'passive', steamCost: 0, range: 0, targetType: 'self', power: 0,
    passiveMods: { maxHp: 8, defense: 3 },
    description: 'Passive: +8 max HP and +3 Defense.',
    resolve: () => {},
  },

  // === Movement (slot 'movement') ===
  sprint: {
    id: 'sprint', name: 'Sprint', kind: 'movement', slot: 'movement', steamCost: 0, range: 0, targetType: 'self', power: 0,
    moveMods: { move: 1 },
    description: 'Movement: +1 Move.',
    resolve: () => {},
  },
  long_stride: {
    id: 'long_stride', name: 'Long Stride', kind: 'movement', slot: 'movement', steamCost: 0, range: 0, targetType: 'self', power: 0,
    moveMods: { move: 2 },
    description: 'Movement: +2 Move.',
    resolve: () => {},
  },
  sure_foot: {
    id: 'sure_foot', name: 'Sure-Foot', kind: 'movement', slot: 'movement', steamCost: 0, range: 0, targetType: 'self', power: 0,
    moveMods: { jump: 1 },
    description: 'Movement: +1 Jump (climb higher).',
    resolve: () => {},
  },
  hover: {
    id: 'hover', name: 'Hover', kind: 'movement', slot: 'movement', steamCost: 0, range: 0, targetType: 'self', power: 0,
    moveMods: { hover: true },
    description: 'Movement: ignore height differences when moving.',
    resolve: () => {},
  },

  // --- Rusthorde (monsters) ---
  bite: {
    id: 'bite',
    name: 'Bite',
    kind: 'attack',
    steamCost: 0,
    range: 1,
    targetType: 'enemy',
    power: 0,
    description: 'A mechanical melee bite.',
    resolve: (state, caster, target) => {
      const t = targetUnit(state, target)
      if (t) applyDamage(t, computeDamage(state.grid, caster, t, 0))
    },
  },
  steam_vent: {
    id: 'steam_vent',
    name: 'Steam Vent',
    kind: 'attack',
    steamCost: 0,
    range: 2,
    targetType: 'enemy',
    power: 1,
    description: 'A short-range jet of scalding steam.',
    resolve: (state, caster, target) => {
      const t = targetUnit(state, target)
      if (t) applyDamage(t, computeDamage(state.grid, caster, t, 1))
    },
  },
  slam: {
    id: 'slam',
    name: 'Slam',
    kind: 'attack',
    steamCost: 0,
    range: 1,
    targetType: 'enemy',
    power: 2,
    description: 'A heavy blow that knocks the target back.',
    resolve: (state, caster, target) => {
      const t = targetUnit(state, target)
      if (!t) return
      applyDamage(t, computeDamage(state.grid, caster, t, 2))
      if (t.status === 'active') pushAway(state, caster.pos, t)
    },
  },
  overpressure: {
    id: 'overpressure',
    name: 'Overpressure',
    kind: 'buff',
    steamCost: 0,
    range: 0,
    targetType: 'self',
    power: 0,
    aiValue: 12,
    description: 'Vent the boiler wide open: +6 Attack for two turns.',
    resolve: (_state, caster) => {
      caster.buffs.push({ id: 'overpressure', attack: 6, turns: 2 })
    },
  },
}

export function getAbility(id: string): AbilityDef {
  const def = ABILITIES[id]
  if (!def) throw new Error(`Unknown ability: ${id}`)
  return def
}

/** Is `target` within range of `caster` for the given ability? */
export function inRange(caster: BattleUnit, def: AbilityDef, pos: Position): boolean {
  if (def.targetType === 'self') return true
  return manhattan(caster.pos, pos) <= def.range
}

/** Does the unit satisfy the ability's target-type requirement? */
export function isValidTargetUnit(
  caster: BattleUnit,
  def: AbilityDef,
  unit: BattleUnit,
): boolean {
  switch (def.targetType) {
    case 'self':
      return unit.id === caster.id
    case 'enemy':
      return unit.team !== caster.team && unit.status === 'active'
    case 'ally':
      return unit.team === caster.team && unit.status === 'active'
    case 'ally-or-ko':
      return unit.team === caster.team
    case 'tile':
      return false
  }
}

/** Convenience used by tests/AI to know a tile's height quickly. */
export function tileHeight(state: BattleState, pos: Position): number {
  return heightAt(state.grid, pos)
}
