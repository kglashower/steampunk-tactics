import { describe, expect, it } from 'vitest'
import { createBattle } from './battle'
import { flatGrid, makeGrid, samePos } from './grid'
import { canMoveTo, canStep, reachableTiles } from './pathfinding'
import { testUnit } from './test-helpers'
import type { BattleUnit } from './types'

const stepper = (jump: number, hover = false) => ({ stats: { jump, hover } }) as BattleUnit

describe('height differential (canStep)', () => {
  it('climbs at most Jump but descends one more', () => {
    const u = stepper(2)
    expect(canStep(u, 0, 2)).toBe(true) // climb 2 (== jump)
    expect(canStep(u, 0, 3)).toBe(false) // climb 3 (> jump)
    expect(canStep(u, 3, 0)).toBe(true) // descend 3 (== jump+1)
    expect(canStep(u, 4, 0)).toBe(false) // descend 4 (> jump+1)
  })

  it('Hover ignores height entirely', () => {
    const u = stepper(1, true)
    expect(canStep(u, 0, 5)).toBe(true)
    expect(canStep(u, 5, 0)).toBe(true)
  })
})

function has(tiles: { x: number; y: number }[], x: number, y: number) {
  return tiles.some((p) => samePos(p, { x, y }))
}

describe('reachableTiles', () => {
  it('reaches all tiles within Move on flat open ground (diamond)', () => {
    const state = createBattle({
      grid: flatGrid(9, 9),
      units: [testUnit({ id: 'u', team: 'player', pos: { x: 4, y: 4 }, stats: { move: 2 } })],
    })
    const tiles = reachableTiles(state, state.units.u)
    // A Manhattan-distance-2 diamond minus the centre = 12 tiles.
    expect(tiles.length).toBe(12)
    expect(has(tiles, 4, 2)).toBe(true) // 2 up
    expect(has(tiles, 6, 4)).toBe(true) // 2 right
    expect(has(tiles, 4, 4)).toBe(false) // start excluded
  })

  it('cannot step onto a tile beyond its Jump height', () => {
    // Tall wall at (1,0); unit with jump 1 cannot climb it.
    const grid = makeGrid([
      [0, 3, 0],
      [0, 0, 0],
    ])
    const state = createBattle({
      grid,
      units: [testUnit({ id: 'u', team: 'player', pos: { x: 0, y: 0 }, stats: { move: 3, jump: 1 } })],
    })
    const tiles = reachableTiles(state, state.units.u)
    expect(has(tiles, 1, 0)).toBe(false) // the wall
    expect(has(tiles, 1, 1)).toBe(true) // ground route is fine
  })

  it('cannot move through or onto an occupied tile', () => {
    const state = createBattle({
      grid: flatGrid(5, 1),
      units: [
        testUnit({ id: 'u', team: 'player', pos: { x: 0, y: 0 }, stats: { move: 4 } }),
        testUnit({ id: 'block', team: 'enemy', pos: { x: 1, y: 0 } }),
      ],
    })
    const tiles = reachableTiles(state, state.units.u)
    // Blocked at x=1, so nothing past it on this 1-row corridor is reachable.
    expect(has(tiles, 1, 0)).toBe(false)
    expect(has(tiles, 2, 0)).toBe(false)
    expect(canMoveTo(state, state.units.u, { x: 2, y: 0 })).toBe(false)
  })
})
