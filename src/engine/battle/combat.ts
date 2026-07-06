import { heightAt } from './grid'
import type { BattleGrid, BattleUnit, Position } from './types'

/** Effective attack including active buffs. */
export function effectiveAttack(unit: BattleUnit): number {
  return unit.stats.attack + unit.buffs.reduce((sum, b) => sum + (b.attack ?? 0), 0)
}

/** Effective defense including active buffs. */
export function effectiveDefense(unit: BattleUnit): number {
  return unit.stats.defense + unit.buffs.reduce((sum, b) => sum + (b.defense ?? 0), 0)
}

/** Effective speed including active buffs (Slow applies a negative modifier). Floored at 1. */
export function effectiveSpeed(unit: BattleUnit): number {
  const raw = unit.stats.speed + unit.buffs.reduce((sum, b) => sum + (b.speed ?? 0), 0)
  return Math.max(1, raw)
}

/**
 * Height advantage bonus to damage: +1 per level higher than the target,
 * -1 per level lower, clamped to [-2, +2]. Deterministic (no accuracy RNG yet).
 */
export function heightBonus(grid: BattleGrid, from: Position, to: Position): number {
  const diff = heightAt(grid, from) - heightAt(grid, to)
  return Math.max(-2, Math.min(2, diff))
}

/** Flat damage soaked by a defender's slotted Guard reaction. */
export const GUARD_REDUCTION = 4

/** How much incoming damage a defender's reaction mitigates. */
export function guardReduction(defender: BattleUnit): number {
  return defender.reaction === 'guard' ? GUARD_REDUCTION : 0
}

/** Physical/ballistic damage. Always at least 1. Applies the target's Guard. */
export function computeDamage(
  grid: BattleGrid,
  attacker: BattleUnit,
  defender: BattleUnit,
  power: number,
): number {
  const raw =
    effectiveAttack(attacker) +
    power +
    heightBonus(grid, attacker.pos, defender.pos) -
    effectiveDefense(defender) -
    guardReduction(defender)
  return Math.max(1, raw)
}

/** Field-repair amount, scaling with the Engineer's Tech. */
export function computeHeal(healer: BattleUnit, power: number): number {
  return Math.max(1, healer.stats.tech + power)
}
