import type { UnitSpec } from './battle'
import type { Position, Team, UnitStats } from './types'

const DEFAULT_STATS: UnitStats = {
  maxHp: 30, hp: 30,
  maxSteam: 10, steam: 10,
  speed: 10, attack: 10, defense: 5, tech: 5,
  move: 4, jump: 1, steamRegen: 2, hover: false,
}

/** Compact unit factory for tests. */
export function testUnit(opts: {
  id: string
  team: Team
  pos: Position
  abilities?: string[]
  ct?: number
  stats?: Partial<UnitStats>
}): UnitSpec {
  return {
    id: opts.id,
    name: opts.id,
    team: opts.team,
    pos: opts.pos,
    abilities: opts.abilities ?? ['strike', 'wait'],
    ct: opts.ct,
    stats: { ...DEFAULT_STATS, ...opts.stats },
  }
}
