import { MONSTER_TEMPLATES, buildUnit } from '../../data/units'
import { JOB_SPRITE } from '../../data/jobs'
import type { BattleConfig } from '../battle/battle'
import { makeGrid } from '../battle/grid'
import type { Position } from '../battle/types'
import type { Character, Territory, TerritoryType } from '../../types'
import { characterStartCt, characterStats } from '../economy/equipment'
import { characterActions, characterReaction } from '../progression/jobs'
import { attackForce } from './balance'

// Per-biome 8x6 arenas (height maps) so battles vary by terrain.
const ARENAS: Record<TerritoryType, number[][]> = {
  // Foundry — a raised central ridge.
  foundry: [
    [0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 1, 1, 1, 1, 0, 0],
    [0, 0, 1, 2, 2, 1, 0, 0],
    [0, 0, 1, 2, 2, 1, 0, 0],
    [0, 0, 1, 1, 1, 1, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0],
  ],
  // Cinder — diagonal slag terraces.
  cinder: [
    [0, 0, 0, 1, 1, 2, 2, 2],
    [0, 0, 0, 1, 1, 1, 2, 2],
    [0, 0, 0, 0, 1, 1, 1, 2],
    [2, 1, 1, 1, 0, 0, 0, 0],
    [2, 2, 1, 1, 1, 0, 0, 0],
    [2, 2, 2, 1, 1, 0, 0, 0],
  ],
  // Verdigris — a sunken central basin.
  verdigris: [
    [2, 2, 1, 1, 1, 1, 2, 2],
    [2, 1, 0, 0, 0, 0, 1, 2],
    [1, 0, 0, 0, 0, 0, 0, 1],
    [1, 0, 0, 0, 0, 0, 0, 1],
    [2, 1, 0, 0, 0, 0, 1, 2],
    [2, 2, 1, 1, 1, 1, 2, 2],
  ],
  // Quartz — scattered crystal pillars.
  quartz: [
    [0, 0, 2, 0, 0, 2, 0, 0],
    [0, 1, 1, 0, 0, 1, 1, 0],
    [0, 1, 0, 0, 0, 0, 1, 0],
    [0, 1, 0, 0, 0, 0, 1, 0],
    [0, 1, 1, 0, 0, 1, 1, 0],
    [0, 0, 2, 0, 0, 2, 0, 0],
  ],
}

const PLAYER_POS: Position[] = [
  { x: 0, y: 2 }, { x: 0, y: 3 }, { x: 1, y: 1 }, { x: 1, y: 4 }, { x: 0, y: 1 },
]
const ENEMY_POS: Position[] = [
  { x: 7, y: 2 }, { x: 7, y: 3 }, { x: 6, y: 1 }, { x: 6, y: 4 }, { x: 7, y: 1 }, { x: 7, y: 4 },
]

/** Build the tactical battle for attacking (or recapturing) a territory. */
export function buildWorldBattle(party: Character[], territory: Territory): BattleConfig {
  const grid = makeGrid(ARENAS[territory.type] ?? ARENAS.foundry)
  const units: BattleConfig['units'] = []

  party.slice(0, PLAYER_POS.length).forEach((ch, i) => {
    units.push({
      id: ch.id,
      name: ch.name,
      team: 'player',
      job: ch.job,
      sprite: JOB_SPRITE[ch.job],
      pos: PLAYER_POS[i],
      abilities: characterActions(ch), // basic + slotted actions + gear-granted
      reaction: characterReaction(ch), // slotted reaction
      stats: characterStats(ch), // job + growth + gear + passive/movement mods
      ct: characterStartCt(ch), // haste from gear
    })
  })

  attackForce(territory)
    .slice(0, ENEMY_POS.length)
    .forEach((key, i) => {
      const template = MONSTER_TEMPLATES[key]
      units.push({
        ...buildUnit({
          id: `enemy-${i}`,
          name: template.name,
          team: 'enemy',
          pos: ENEMY_POS[i],
          template,
        }),
        sprite: territory.type, // monster family silhouette
      })
    })

  return { grid, units }
}
