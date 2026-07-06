import { heightAt, inBounds, isOccupied, neighbors, samePos } from './grid'
import type { BattleState, BattleUnit, Position } from './types'

function key(p: Position): string {
  return `${p.x},${p.y}`
}

/** Extra height a unit may descend beyond what it can climb (asymmetric). */
export const DESCEND_BONUS = 1

/**
 * Whether a unit can step from `fromH` to `toH`, honoring the asymmetric height
 * rule: climbing up is limited by Jump, dropping down allows Jump + DESCEND_BONUS.
 * A hovering unit ignores height differences entirely.
 */
export function canStep(unit: BattleUnit, fromH: number, toH: number): boolean {
  if (unit.stats.hover) return true
  const delta = toH - fromH
  if (delta > 0) return delta <= unit.stats.jump // climbing
  return -delta <= unit.stats.jump + DESCEND_BONUS // descending
}

/**
 * Breadth-first reachable-tile search for a unit.
 *
 * Rules:
 *  - 4-directional movement, cost 1 per tile, up to the unit's Move stat.
 *  - Step height obeys `canStep` (climb ≤ Jump, descend ≤ Jump+1; Hover ignores).
 *  - Cannot enter a tile occupied by another active unit.
 *  - The unit's own starting tile is not included in the results.
 */
export function reachableTiles(state: BattleState, unit: BattleUnit): Position[] {
  const grid = state.grid
  const start = unit.pos
  const costs = new Map<string, number>()
  costs.set(key(start), 0)

  let frontier: Position[] = [start]
  for (let step = 0; step < unit.stats.move; step++) {
    const next: Position[] = []
    for (const cur of frontier) {
      const curHeight = heightAt(grid, cur)
      for (const nb of neighbors(cur)) {
        if (!inBounds(grid, nb)) continue
        if (costs.has(key(nb))) continue
        if (!canStep(unit, curHeight, heightAt(grid, nb))) continue
        if (isOccupied(state, nb)) continue
        costs.set(key(nb), step + 1)
        next.push(nb)
      }
    }
    frontier = next
  }

  const result: Position[] = []
  for (const [k] of costs) {
    const [x, y] = k.split(',').map(Number)
    if (!samePos({ x, y }, start)) result.push({ x, y })
  }
  return result
}

/** Whether a unit can legally move to a target tile this turn. */
export function canMoveTo(state: BattleState, unit: BattleUnit, target: Position): boolean {
  return reachableTiles(state, unit).some((p) => samePos(p, target))
}
