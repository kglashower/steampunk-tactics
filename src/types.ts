// Core domain types shared across the game.
// Kept intentionally small for Phase 0; expands as systems land.

export type ResourceType = 'coal' | 'iron' | 'copper' | 'quartz'

export type TerritoryType = 'foundry' | 'cinder' | 'verdigris' | 'quartz'

export type JobId =
  // Tier 1 roots (always unlocked)
  | 'soldier' | 'gunner' | 'engineer'
  // Tier 2
  | 'dragoon' | 'sentinel'
  | 'sniper' | 'grenadier'
  | 'machinist' | 'medic'
  // Tier 3 capstones
  | 'warlord' | 'sharpshooter' | 'artificer'

/** Which of a character's five ability slots an ability can occupy. */
export type AbilitySlot = 'action' | 'reaction' | 'passive' | 'movement'

/** The five equipped ability slots (2 action + 1 each reaction/passive/movement). */
export interface Loadout {
  actions: [string | null, string | null]
  reaction: string | null
  passive: string | null
  movement: string | null
}

export type BuildingType = 'forge' | 'workshop' | 'gunsmith'

export type EquipSlot = 'weapon' | 'armor' | 'accessory'

export type ScreenId = 'map' | 'roster' | 'crafting' | 'buildings'

export interface BuildingInstance {
  type: BuildingType
  level: number
}

export interface Territory {
  id: string
  name: string
  type: TerritoryType
  resource: ResourceType
  owner: 'player' | 'wild'
  /** When true, production stops and buildings are inactive until recaptured. */
  overrun: boolean
  /** Ids of adjacent territories (node-graph edges). */
  adjacency: string[]
  /** Character ids stationed here to defend it. */
  garrison: string[]
  /** Buildings constructed on this territory. */
  buildings: BuildingInstance[]
  /** Distance band from home (0 = home), driving monster strength. */
  tier: number
  /** Normalized 0–100 position for the node-graph map. */
  coord: { x: number; y: number }
}

export interface Character {
  id: string
  name: string
  /** Currently active job (must be in unlockedJobs). */
  job: JobId
  level: number
  /** Experience accumulated toward the next level. */
  xp: number
  /** Job Points available to spend unlocking jobs and learning abilities. */
  jp: number
  /** Jobs this character has unlocked in the tree (roots included). */
  unlockedJobs: JobId[]
  /** Ability ids learned (across all jobs) — the pool that can be slotted. */
  unlocked: string[]
  /** The five equipped ability slots. */
  loadout: Loadout
  /** Equipped item ids by slot. */
  equipment: Partial<Record<EquipSlot, string>>
}

/** The persisted game state (everything that goes into a save file). */
export interface GameState {
  /** Save schema version, for future migrations. */
  version: number
  /** Current turn / "day". */
  turn: number
  resources: Record<ResourceType, number>
  territories: Record<string, Territory>
  roster: Record<string, Character>
  /** Unequipped crafted items, keyed by item id -> count. */
  inventory: Record<string, number>
}
