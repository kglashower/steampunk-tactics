import type { BattleGrid, Position } from '../../engine/battle/types'

// Isometric tile metrics (2:1 diamond). Placeholder-art friendly.
export const TILE_W = 56
export const TILE_H = 28
/** Pixels of vertical lift per elevation level. */
export const ELEV = 14
/** Base "thickness" so even height-0 tiles read as solid floor. */
export const BASE_THICKNESS = 6

export interface ScreenPoint {
  x: number
  y: number
}

/**
 * Project a grid cell to the screen-space center of its top face.
 * `origin` shifts the whole board so it can be centered in the view.
 */
export function gridToScreen(gx: number, gy: number, h: number, origin: ScreenPoint): ScreenPoint {
  return {
    x: origin.x + (gx - gy) * (TILE_W / 2),
    y: origin.y + (gx + gy) * (TILE_H / 2) - h * ELEV,
  }
}

/** Painter's-order depth key: lower = drawn first (further back). */
export function depth(gx: number, gy: number): number {
  return gx + gy
}

/** Board rotation about the z-axis, in 90° steps. */
export type Rotation = 0 | 1 | 2 | 3

/** Grid dimensions after rotation (width/height swap on odd steps). */
export function rotatedDims(width: number, height: number, rot: Rotation): { w: number; h: number } {
  return rot % 2 === 0 ? { w: width, h: height } : { w: height, h: width }
}

/**
 * Map a logical grid cell to projection coordinates for a given rotation, so the
 * isometric board appears rotated about the z-axis. Heights are unaffected.
 */
export function rotateCoord(gx: number, gy: number, rot: Rotation, width: number, height: number): Position {
  switch (rot) {
    case 1:
      return { x: height - 1 - gy, y: gx }
    case 2:
      return { x: width - 1 - gx, y: height - 1 - gy }
    case 3:
      return { x: gy, y: width - 1 - gx }
    default:
      return { x: gx, y: gy }
  }
}

/**
 * Compute an origin that centers the board (accounting for its diamond shape, the
 * tallest column, and the current rotation) inside a viewport of the given size.
 */
export function boardOrigin(grid: BattleGrid, rot: Rotation, viewW: number, viewH: number): ScreenPoint {
  let maxH = 0
  for (const row of grid.tiles) for (const t of row) maxH = Math.max(maxH, t.height)

  const { w, h } = rotatedDims(grid.width, grid.height, rot)
  const totalW = (w + h) * (TILE_W / 2)
  const totalH = (w + h) * (TILE_H / 2) + maxH * ELEV + BASE_THICKNESS

  // Leftmost point in board-space is at rx=0,ry=h-1 (x = -(h-1)*TILE_W/2).
  const leftExtent = (h - 1) * (TILE_W / 2)
  // Topmost point is the highest tile's top face.
  const topExtent = maxH * ELEV + TILE_H / 2

  return {
    x: (viewW - totalW) / 2 + leftExtent + TILE_W / 2,
    y: (viewH - totalH) / 2 + topExtent,
  }
}

export function posKey(p: Position): string {
  return `${p.x},${p.y}`
}
