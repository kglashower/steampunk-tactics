import type { Character, GameState, JobId, ResourceType, Territory, TerritoryType } from '../types'

export const SAVE_VERSION = 6

const RESOURCE_OF: Record<TerritoryType, ResourceType> = {
  foundry: 'iron',
  cinder: 'coal',
  verdigris: 'copper',
  quartz: 'quartz',
}

// A larger region: home Ironhold at the top, six tiers fanning outward and
// downward into increasingly dangerous biomes. `links` lists edges to other
// nodes; adjacency is symmetrized automatically. Coordinates span a tall canvas
// (the map view scrolls).
interface Seed {
  id: string
  name: string
  type: TerritoryType
  tier: number
  x: number
  y: number
  links: string[]
  home?: boolean
}

const SEEDS: Seed[] = [
  // Tier 0 — home
  { id: 'ironhold', name: 'Ironhold', type: 'foundry', tier: 0, x: 50, y: 12, links: [], home: true },
  // Tier 1
  { id: 'cinder-flats', name: 'Cinder Flats', type: 'cinder', tier: 1, x: 24, y: 36, links: ['ironhold'] },
  { id: 'old-foundry', name: 'Old Foundry', type: 'foundry', tier: 1, x: 50, y: 36, links: ['ironhold'] },
  { id: 'verdigris-mesa', name: 'Verdigris Mesa', type: 'verdigris', tier: 1, x: 76, y: 36, links: ['ironhold'] },
  // Tier 2
  { id: 'ashfields', name: 'Ashfields', type: 'cinder', tier: 2, x: 14, y: 60, links: ['cinder-flats'] },
  { id: 'quartz-hollow', name: 'Quartz Hollow', type: 'quartz', tier: 2, x: 34, y: 60, links: ['cinder-flats', 'old-foundry'] },
  { id: 'gear-yards', name: 'Gear Yards', type: 'foundry', tier: 2, x: 55, y: 60, links: ['old-foundry'] },
  { id: 'brass-mesa', name: 'Brass Mesa', type: 'verdigris', tier: 2, x: 74, y: 60, links: ['old-foundry', 'verdigris-mesa'] },
  { id: 'patina-gorge', name: 'Patina Gorge', type: 'verdigris', tier: 2, x: 90, y: 60, links: ['verdigris-mesa'] },
  // Tier 3
  { id: 'the-furnace', name: 'The Furnace', type: 'cinder', tier: 3, x: 12, y: 86, links: ['ashfields'] },
  { id: 'glass-hollow', name: 'Glass Hollow', type: 'quartz', tier: 3, x: 32, y: 86, links: ['ashfields', 'quartz-hollow'] },
  { id: 'ironworks', name: 'Ironworks', type: 'foundry', tier: 3, x: 52, y: 86, links: ['quartz-hollow', 'gear-yards'] },
  { id: 'copper-warrens', name: 'Copper Warrens', type: 'verdigris', tier: 3, x: 72, y: 86, links: ['gear-yards', 'brass-mesa'] },
  { id: 'slag-basin', name: 'Slag Basin', type: 'cinder', tier: 3, x: 90, y: 86, links: ['patina-gorge'] },
  // Tier 4
  { id: 'obsidian-reach', name: 'Obsidian Reach', type: 'quartz', tier: 4, x: 22, y: 112, links: ['the-furnace', 'glass-hollow'] },
  { id: 'the-scrapyard', name: 'The Scrapyard', type: 'foundry', tier: 4, x: 44, y: 112, links: ['glass-hollow', 'ironworks'] },
  { id: 'verdigris-deep', name: 'Verdigris Deep', type: 'verdigris', tier: 4, x: 66, y: 112, links: ['ironworks', 'copper-warrens'] },
  { id: 'cinder-peak', name: 'Cinder Peak', type: 'cinder', tier: 4, x: 88, y: 112, links: ['copper-warrens', 'slag-basin'] },
  // Tier 5
  { id: 'glass-spire', name: 'Glass Spire', type: 'quartz', tier: 5, x: 30, y: 140, links: ['obsidian-reach', 'the-scrapyard'] },
  { id: 'the-great-forge', name: 'The Great Forge', type: 'foundry', tier: 5, x: 55, y: 140, links: ['the-scrapyard', 'verdigris-deep'] },
  { id: 'oxide-throne', name: 'Oxide Throne', type: 'verdigris', tier: 5, x: 78, y: 140, links: ['verdigris-deep', 'cinder-peak'] },
  // Final capstone
  { id: 'the-crucible', name: 'The Crucible', type: 'foundry', tier: 5, x: 55, y: 166, links: ['glass-spire', 'the-great-forge', 'oxide-throne'] },
]

function initialTerritories(): Record<string, Territory> {
  // Symmetrize adjacency from links.
  const adj: Record<string, Set<string>> = {}
  for (const s of SEEDS) adj[s.id] = new Set()
  for (const s of SEEDS) {
    for (const l of s.links) {
      adj[s.id].add(l)
      adj[l].add(s.id)
    }
  }
  const territories: Record<string, Territory> = {}
  for (const s of SEEDS) {
    territories[s.id] = {
      id: s.id,
      name: s.name,
      type: s.type,
      resource: RESOURCE_OF[s.type],
      owner: s.home ? 'player' : 'wild',
      overrun: false,
      adjacency: [...adj[s.id]],
      garrison: [],
      buildings: [],
      tier: s.tier,
      coord: { x: s.x, y: s.y },
    }
  }
  return territories
}

const ROOTS: JobId[] = ['soldier', 'gunner', 'engineer']

function initialRoster(): Record<string, Character> {
  const seeds: { id: string; name: string; job: JobId; ability: string }[] = [
    { id: 'c1', name: 'Brannock', job: 'soldier', ability: 'power_strike' },
    { id: 'c2', name: 'Pell', job: 'gunner', ability: 'aimed_shot' },
    { id: 'c3', name: 'Cogsworth', job: 'engineer', ability: 'field_repair' },
  ]
  const roster: Record<string, Character> = {}
  for (const s of seeds) {
    roster[s.id] = {
      id: s.id,
      name: s.name,
      job: s.job,
      level: 1,
      xp: 0,
      jp: 0,
      unlockedJobs: [...ROOTS],
      unlocked: [s.ability],
      loadout: { actions: [s.ability, null], reaction: null, passive: null, movement: null },
      equipment: {},
    }
  }
  return roster
}

export function createInitialState(): GameState {
  return {
    version: SAVE_VERSION,
    turn: 1,
    resources: { coal: 0, iron: 0, copper: 0, quartz: 0 },
    territories: initialTerritories(),
    roster: initialRoster(),
    inventory: {},
  }
}
