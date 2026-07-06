import type { BattleConfig } from '../engine/battle/battle'
import { makeGrid } from '../engine/battle/grid'
import { JOB_TEMPLATES, MONSTER_TEMPLATES, buildUnit } from './units'

/**
 * A small demo skirmish for testing the engine: the player's three-person crew
 * versus a Rusthorde pack, on an 8x6 map with a raised ridge down the middle.
 */
export function createSkirmish(): BattleConfig {
  // Heights: a ridge of elevation 1-2 across the centre to exercise jump/height.
  const grid = makeGrid([
    [0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 1, 1, 1, 1, 0, 0],
    [0, 0, 1, 2, 2, 1, 0, 0],
    [0, 0, 1, 2, 2, 1, 0, 0],
    [0, 0, 1, 1, 1, 1, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0],
  ])

  return {
    grid,
    units: [
      buildUnit({ id: 'p_soldier', team: 'player', job: 'soldier', name: 'Brannock', pos: { x: 0, y: 2 }, template: JOB_TEMPLATES.soldier }),
      buildUnit({ id: 'p_gunner', team: 'player', job: 'gunner', name: 'Pell', pos: { x: 0, y: 3 }, template: JOB_TEMPLATES.gunner }),
      buildUnit({ id: 'p_engineer', team: 'player', job: 'engineer', name: 'Cogsworth', pos: { x: 1, y: 4 }, template: JOB_TEMPLATES.engineer }),

      buildUnit({ id: 'e1', team: 'enemy', name: 'Scrapling A', pos: { x: 7, y: 2 }, template: MONSTER_TEMPLATES.scrapling }),
      buildUnit({ id: 'e2', team: 'enemy', name: 'Scrapling B', pos: { x: 7, y: 3 }, template: MONSTER_TEMPLATES.scrapling }),
      buildUnit({ id: 'e3', team: 'enemy', name: 'Rust Hound', pos: { x: 7, y: 4 }, template: MONSTER_TEMPLATES.rust_hound }),
    ],
  }
}
