import type { UnitSpec } from '../engine/battle/battle'
import type { Position, Team } from '../engine/battle/types'
import type { JobId, TerritoryType } from '../types'

export interface UnitTemplate {
  name: string
  abilities: string[]
  maxHp: number
  maxSteam: number
  speed: number
  attack: number
  defense: number
  tech: number
  move: number
  jump: number
}

// Player job stat blocks (Lv1). The `abilities` list is only used for monsters;
// player action menus come from the character's basic attack + slotted loadout.
export const JOB_TEMPLATES: Record<JobId, UnitTemplate> = {
  soldier: {
    name: 'Soldier', abilities: ['strike', 'wait'],
    maxHp: 40, maxSteam: 6, speed: 10, attack: 12, defense: 10, tech: 3, move: 4, jump: 2,
  },
  gunner: {
    name: 'Gunner', abilities: ['shoot', 'wait'],
    maxHp: 28, maxSteam: 6, speed: 12, attack: 13, defense: 6, tech: 4, move: 4, jump: 2,
  },
  engineer: {
    name: 'Engineer', abilities: ['wrench_strike', 'wait'],
    maxHp: 32, maxSteam: 10, speed: 11, attack: 7, defense: 7, tech: 12, move: 4, jump: 2,
  },
  dragoon: {
    name: 'Dragoon', abilities: ['strike', 'wait'],
    maxHp: 38, maxSteam: 8, speed: 12, attack: 14, defense: 8, tech: 3, move: 5, jump: 3,
  },
  sentinel: {
    name: 'Sentinel', abilities: ['strike', 'wait'],
    maxHp: 48, maxSteam: 6, speed: 8, attack: 10, defense: 15, tech: 3, move: 3, jump: 2,
  },
  sniper: {
    name: 'Sniper', abilities: ['shoot', 'wait'],
    maxHp: 26, maxSteam: 8, speed: 11, attack: 15, defense: 5, tech: 4, move: 4, jump: 2,
  },
  grenadier: {
    name: 'Grenadier', abilities: ['shoot', 'wait'],
    maxHp: 32, maxSteam: 8, speed: 10, attack: 13, defense: 7, tech: 6, move: 4, jump: 2,
  },
  machinist: {
    name: 'Machinist', abilities: ['wrench_strike', 'wait'],
    maxHp: 30, maxSteam: 12, speed: 11, attack: 8, defense: 7, tech: 15, move: 4, jump: 2,
  },
  medic: {
    name: 'Medic', abilities: ['wrench_strike', 'wait'],
    maxHp: 34, maxSteam: 14, speed: 11, attack: 6, defense: 8, tech: 13, move: 4, jump: 2,
  },
  warlord: {
    name: 'Warlord', abilities: ['strike', 'wait'],
    maxHp: 52, maxSteam: 8, speed: 10, attack: 15, defense: 13, tech: 4, move: 4, jump: 2,
  },
  sharpshooter: {
    name: 'Sharpshooter', abilities: ['shoot', 'wait'],
    maxHp: 32, maxSteam: 10, speed: 12, attack: 17, defense: 7, tech: 5, move: 4, jump: 2,
  },
  artificer: {
    name: 'Artificer', abilities: ['wrench_strike', 'wait'],
    maxHp: 38, maxSteam: 16, speed: 11, attack: 8, defense: 9, tech: 17, move: 4, jump: 2,
  },
}

/** Per-level stat gains applied for each level above 1. */
export interface JobGrowth {
  maxHp: number
  maxSteam: number
  attack: number
  defense: number
  tech: number
}

export const JOB_GROWTH: Record<JobId, JobGrowth> = {
  soldier: { maxHp: 6, maxSteam: 0, attack: 1, defense: 1, tech: 0 },
  gunner: { maxHp: 4, maxSteam: 1, attack: 2, defense: 0, tech: 0 },
  engineer: { maxHp: 5, maxSteam: 1, attack: 0, defense: 1, tech: 2 },
  dragoon: { maxHp: 5, maxSteam: 1, attack: 2, defense: 1, tech: 0 },
  sentinel: { maxHp: 8, maxSteam: 0, attack: 1, defense: 2, tech: 0 },
  sniper: { maxHp: 3, maxSteam: 1, attack: 3, defense: 0, tech: 0 },
  grenadier: { maxHp: 4, maxSteam: 1, attack: 2, defense: 0, tech: 1 },
  machinist: { maxHp: 4, maxSteam: 1, attack: 0, defense: 1, tech: 3 },
  medic: { maxHp: 5, maxSteam: 1, attack: 0, defense: 1, tech: 2 },
  warlord: { maxHp: 7, maxSteam: 1, attack: 2, defense: 2, tech: 0 },
  sharpshooter: { maxHp: 4, maxSteam: 1, attack: 3, defense: 0, tech: 1 },
  artificer: { maxHp: 5, maxSteam: 1, attack: 0, defense: 1, tech: 3 },
}

// Monster stat blocks — one family per biome, three strength tiers each.
// Family flavor: Rusthorde balanced, Ashborn aggressive/ranged-heat,
// Corrosion tanky, Resonance fast glass-cannons. See docs/mvp-design.md §5.1.
export const MONSTER_TEMPLATES: Record<string, UnitTemplate> = {
  // Rusthorde (foundry) — balanced feral automatons.
  scrapling: {
    name: 'Scrapling', abilities: ['bite', 'wait'],
    maxHp: 18, maxSteam: 0, speed: 11, attack: 6, defense: 2, tech: 0, move: 4, jump: 2,
  },
  rust_hound: {
    name: 'Rust Hound', abilities: ['bite', 'steam_vent', 'wait'],
    maxHp: 34, maxSteam: 0, speed: 13, attack: 11, defense: 4, tech: 0, move: 5, jump: 2,
  },
  boiler_brute: {
    name: 'Boiler Brute', abilities: ['slam', 'overpressure', 'wait'],
    maxHp: 70, maxSteam: 0, speed: 8, attack: 18, defense: 8, tech: 0, move: 3, jump: 1,
  },

  // Ashborn (cinder) — high attack, ranged heat, fragile.
  ember_drone: {
    name: 'Ember Drone', abilities: ['steam_vent', 'wait'],
    maxHp: 16, maxSteam: 0, speed: 13, attack: 8, defense: 1, tech: 0, move: 4, jump: 2,
  },
  slag_hound: {
    name: 'Slag Hound', abilities: ['bite', 'steam_vent', 'wait'],
    maxHp: 30, maxSteam: 0, speed: 12, attack: 14, defense: 3, tech: 0, move: 5, jump: 2,
  },
  furnace_brute: {
    name: 'Furnace Brute', abilities: ['slam', 'overpressure', 'wait'],
    maxHp: 64, maxSteam: 0, speed: 9, attack: 22, defense: 6, tech: 0, move: 3, jump: 1,
  },

  // Corrosion (verdigris) — slow, tanky, heavily armored.
  patina_skitter: {
    name: 'Patina Skitter', abilities: ['bite', 'wait'],
    maxHp: 26, maxSteam: 0, speed: 9, attack: 6, defense: 6, tech: 0, move: 3, jump: 2,
  },
  verdigris_stalker: {
    name: 'Verdigris Stalker', abilities: ['bite', 'slam', 'wait'],
    maxHp: 46, maxSteam: 0, speed: 10, attack: 12, defense: 9, tech: 0, move: 4, jump: 2,
  },
  oxide_colossus: {
    name: 'Oxide Colossus', abilities: ['slam', 'overpressure', 'wait'],
    maxHp: 95, maxSteam: 0, speed: 7, attack: 17, defense: 14, tech: 0, move: 3, jump: 1,
  },

  // Resonance (quartz) — fast, ranged, glass cannons.
  shard_drone: {
    name: 'Shard Drone', abilities: ['shoot', 'wait'],
    maxHp: 15, maxSteam: 0, speed: 15, attack: 10, defense: 1, tech: 0, move: 5, jump: 3,
  },
  resonator_hound: {
    name: 'Resonator Hound', abilities: ['shoot', 'bite', 'wait'],
    maxHp: 28, maxSteam: 0, speed: 16, attack: 15, defense: 3, tech: 0, move: 5, jump: 3,
  },
  quartz_sentinel: {
    name: 'Quartz Sentinel', abilities: ['shoot', 'slam', 'wait'],
    maxHp: 58, maxSteam: 0, speed: 12, attack: 20, defense: 7, tech: 0, move: 4, jump: 2,
  },
}

/** Monster family per biome: three template keys ordered light → heavy. */
export interface MonsterFamily {
  name: string
  tiers: [string, string, string]
}

export const MONSTER_FAMILIES: Record<TerritoryType, MonsterFamily> = {
  foundry: { name: 'Rusthorde', tiers: ['scrapling', 'rust_hound', 'boiler_brute'] },
  cinder: { name: 'Ashborn', tiers: ['ember_drone', 'slag_hound', 'furnace_brute'] },
  verdigris: { name: 'Corrosion', tiers: ['patina_skitter', 'verdigris_stalker', 'oxide_colossus'] },
  quartz: { name: 'Resonance', tiers: ['shard_drone', 'resonator_hound', 'quartz_sentinel'] },
}

export interface BuildUnitOptions {
  id: string
  team: Team
  pos: Position
  template: UnitTemplate
  job?: JobId
  name?: string
}

/** Turn a template into a ready-to-place battle unit spec. */
export function buildUnit(opts: BuildUnitOptions): UnitSpec {
  const t = opts.template
  return {
    id: opts.id,
    name: opts.name ?? t.name,
    team: opts.team,
    job: opts.job,
    pos: opts.pos,
    abilities: t.abilities,
    stats: {
      maxHp: t.maxHp, hp: t.maxHp,
      maxSteam: t.maxSteam, steam: t.maxSteam,
      speed: t.speed, attack: t.attack, defense: t.defense, tech: t.tech,
      move: t.move, jump: t.jump, steamRegen: 2, hover: false,
    },
  }
}
