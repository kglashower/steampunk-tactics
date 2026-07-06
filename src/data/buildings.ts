import type { BuildingType, ResourceType, TerritoryType } from '../types'

export type ResourceCost = Partial<Record<ResourceType, number>>

export interface BuildingDef {
  id: BuildingType
  name: string
  glyph: string
  /** Territory type this building may be constructed on. */
  allowed: TerritoryType
  maxLevel: number
  /** Cost to reach each level: levelCost[0] builds L1, levelCost[1] upgrades to L2. */
  levelCost: ResourceCost[]
  unlocks: string
}

// See docs/mvp-design.md §9.
export const BUILDINGS: Record<BuildingType, BuildingDef> = {
  forge: {
    id: 'forge',
    name: 'Forge',
    glyph: '🔨',
    allowed: 'foundry',
    maxLevel: 2,
    levelCost: [
      { iron: 15, coal: 10 },
      { iron: 30, coal: 20, copper: 10 },
    ],
    unlocks: 'Crafts weapons. Level 2 unlocks tier-2 weapons.',
  },
  workshop: {
    id: 'workshop',
    name: 'Workshop',
    glyph: '⚙',
    allowed: 'verdigris',
    maxLevel: 2,
    levelCost: [
      { copper: 15, iron: 10 },
      { copper: 30, iron: 20, coal: 10 },
    ],
    unlocks: 'Crafts armor & accessories. Level 2 unlocks tier-2 gear.',
  },
  gunsmith: {
    id: 'gunsmith',
    name: 'Gunsmith',
    glyph: '🛠',
    allowed: 'quartz',
    maxLevel: 1,
    levelCost: [{ quartz: 20, iron: 15, copper: 10 }],
    unlocks: 'Crafts tier-3 weapons from quartz-tuned components.',
  },
}

export const BUILDING_ORDER: BuildingType[] = ['forge', 'workshop', 'gunsmith']
