import type { BattleGrid, BattleState, BattleUnit, Position, Tile } from './types'

/** Build a grid from a 2D array of heights (rows top-to-bottom). */
export function makeGrid(heights: number[][]): BattleGrid {
  const height = heights.length
  const width = height > 0 ? heights[0].length : 0
  const tiles: Tile[][] = heights.map((row) => row.map((h) => ({ height: h })))
  return { width, height, tiles }
}

/** Flat grid of a given size, all at elevation 0. */
export function flatGrid(width: number, height: number): BattleGrid {
  const heights = Array.from({ length: height }, () => Array.from({ length: width }, () => 0))
  return makeGrid(heights)
}

export function inBounds(grid: BattleGrid, p: Position): boolean {
  return p.x >= 0 && p.y >= 0 && p.x < grid.width && p.y < grid.height
}

export function tileAt(grid: BattleGrid, p: Position): Tile | undefined {
  if (!inBounds(grid, p)) return undefined
  return grid.tiles[p.y][p.x]
}

export function heightAt(grid: BattleGrid, p: Position): number {
  return tileAt(grid, p)?.height ?? 0
}

export function samePos(a: Position, b: Position): boolean {
  return a.x === b.x && a.y === b.y
}

/** Manhattan distance — the natural metric for 4-directional grids. */
export function manhattan(a: Position, b: Position): number {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y)
}

/** Orthogonal neighbors (up/down/left/right). */
export function neighbors(p: Position): Position[] {
  return [
    { x: p.x, y: p.y - 1 },
    { x: p.x, y: p.y + 1 },
    { x: p.x - 1, y: p.y },
    { x: p.x + 1, y: p.y },
  ]
}

/** The active (non-KO) unit standing on a tile, if any. */
export function unitAt(state: BattleState, p: Position): BattleUnit | undefined {
  return Object.values(state.units).find(
    (u) => u.status === 'active' && samePos(u.pos, p),
  )
}

export function isOccupied(state: BattleState, p: Position): boolean {
  return unitAt(state, p) !== undefined
}
