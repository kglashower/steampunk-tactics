import type { BuildingType, EquipSlot, JobId } from '../types'
import type { ResourceCost } from './buildings'

/** Flat stat bonuses an item grants while equipped. */
export interface ItemMods {
  attack?: number
  defense?: number
  maxHp?: number
  maxSteam?: number
  tech?: number
}

export interface ItemDef {
  id: string
  name: string
  slot: EquipSlot
  tier: 1 | 2 | 3
  /** Building (and level) required to craft. */
  building: BuildingType
  reqLevel: number
  mods: ItemMods
  recipe: {
    resources: ResourceCost
    /** If set, crafting consumes one of this item (a tier upgrade). */
    upgradeFrom?: string
  }
  /** Flavor: which class this is meant for. */
  bestFor?: JobId
  /** Hard job lock: only this class can equip the item. */
  job?: JobId
  // --- Passive effects (job gear) ---
  /** Extra Steam restored each turn while equipped. */
  steamRegen?: number
  /** Charge-Time head start at the beginning of a battle. */
  startCt?: number
  /** An extra ability this gear grants in battle (even if not unlocked). */
  grantsAbility?: string
  desc: string
}

// See docs/mvp-design.md §10.
export const ITEMS: Record<string, ItemDef> = {
  // --- Weapons (Forge) ---
  iron_saber: {
    id: 'iron_saber', name: 'Iron Saber', slot: 'weapon', tier: 1, building: 'forge', reqLevel: 1,
    mods: { attack: 4 }, recipe: { resources: { iron: 8, coal: 4 } }, bestFor: 'soldier',
    desc: 'A sturdy frontline blade.',
  },
  flintlock_carbine: {
    id: 'flintlock_carbine', name: 'Flintlock Carbine', slot: 'weapon', tier: 1, building: 'forge', reqLevel: 1,
    mods: { attack: 5 }, recipe: { resources: { iron: 6, coal: 6 } }, bestFor: 'gunner',
    desc: 'A reliable powder firearm.',
  },
  spanner: {
    id: 'spanner', name: 'Spanner', slot: 'weapon', tier: 1, building: 'forge', reqLevel: 1,
    mods: { attack: 3, tech: 2 }, recipe: { resources: { iron: 6, copper: 2 } }, bestFor: 'engineer',
    desc: 'A heavy wrench that doubles as a tool.',
  },
  steel_saber: {
    id: 'steel_saber', name: 'Steel Saber', slot: 'weapon', tier: 2, building: 'forge', reqLevel: 2,
    mods: { attack: 8 }, recipe: { resources: { iron: 14, coal: 8, copper: 4 }, upgradeFrom: 'iron_saber' }, bestFor: 'soldier',
    desc: 'A tempered, razor-edged saber.',
  },
  pneumatic_rifle: {
    id: 'pneumatic_rifle', name: 'Pneumatic Rifle', slot: 'weapon', tier: 2, building: 'forge', reqLevel: 2,
    mods: { attack: 9 }, recipe: { resources: { iron: 12, coal: 8, copper: 6 }, upgradeFrom: 'flintlock_carbine' }, bestFor: 'gunner',
    desc: 'Steam-charged for punishing range.',
  },
  powered_wrench: {
    id: 'powered_wrench', name: 'Powered Wrench', slot: 'weapon', tier: 2, building: 'forge', reqLevel: 2,
    mods: { attack: 5, tech: 5 }, recipe: { resources: { iron: 10, copper: 10 }, upgradeFrom: 'spanner' }, bestFor: 'engineer',
    desc: 'A motorized multi-tool.',
  },

  // --- Armor & accessories (Workshop) ---
  riveted_vest: {
    id: 'riveted_vest', name: 'Riveted Vest', slot: 'armor', tier: 1, building: 'workshop', reqLevel: 1,
    mods: { defense: 4, maxHp: 8 }, recipe: { resources: { copper: 8, iron: 4 } },
    desc: 'Layered plates over canvas.',
  },
  brass_goggles: {
    id: 'brass_goggles', name: 'Brass Goggles', slot: 'accessory', tier: 1, building: 'workshop', reqLevel: 1,
    mods: { attack: 2 }, recipe: { resources: { copper: 6 } },
    desc: 'Sharpened aim through fine optics.',
  },
  plated_cuirass: {
    id: 'plated_cuirass', name: 'Plated Cuirass', slot: 'armor', tier: 2, building: 'workshop', reqLevel: 2,
    mods: { defense: 8, maxHp: 16 }, recipe: { resources: { copper: 14, iron: 8, coal: 4 }, upgradeFrom: 'riveted_vest' },
    desc: 'A full breastplate of riveted steel.',
  },
  pressure_regulator: {
    id: 'pressure_regulator', name: 'Pressure Regulator', slot: 'accessory', tier: 2, building: 'workshop', reqLevel: 2,
    mods: { maxSteam: 6 }, recipe: { resources: { copper: 12, iron: 6 }, upgradeFrom: 'brass_goggles' },
    desc: 'Holds more boiler pressure in reserve.',
  },

  // --- Tier-3 weapons (Gunsmith, quartz-tuned) ---
  tempered_greatblade: {
    id: 'tempered_greatblade', name: 'Tempered Greatblade', slot: 'weapon', tier: 3, building: 'gunsmith', reqLevel: 1,
    mods: { attack: 13 }, recipe: { resources: { quartz: 10, iron: 12, coal: 6 }, upgradeFrom: 'steel_saber' }, bestFor: 'soldier',
    desc: 'A quartz-edged blade that never dulls.',
  },
  repeating_rifle: {
    id: 'repeating_rifle', name: 'Repeating Rifle', slot: 'weapon', tier: 3, building: 'gunsmith', reqLevel: 1,
    mods: { attack: 14 }, recipe: { resources: { quartz: 10, iron: 10, copper: 8 }, upgradeFrom: 'pneumatic_rifle' }, bestFor: 'gunner',
    desc: 'A crystal-regulated rapid-fire rifle.',
  },
  dynamo_wrench: {
    id: 'dynamo_wrench', name: 'Dynamo Wrench', slot: 'weapon', tier: 3, building: 'gunsmith', reqLevel: 1,
    mods: { attack: 8, tech: 8 }, recipe: { resources: { quartz: 10, copper: 12 }, upgradeFrom: 'powered_wrench' }, bestFor: 'engineer',
    desc: 'A resonant multi-tool humming with charge.',
  },

  // --- Job-specific gear (Workshop): job-locked, with passive effects ---
  aegis_plate: {
    id: 'aegis_plate', name: 'Aegis Plate', slot: 'armor', tier: 2, building: 'workshop', reqLevel: 2,
    job: 'soldier', mods: { defense: 10, maxHp: 18 }, steamRegen: 2,
    recipe: { resources: { copper: 16, iron: 12, coal: 6 } },
    desc: 'Soldier only. A bastion of plate that vents spare steam back to its wearer.',
  },
  charged_greaves: {
    id: 'charged_greaves', name: 'Charged Greaves', slot: 'accessory', tier: 2, building: 'workshop', reqLevel: 2,
    job: 'soldier', mods: { defense: 3 }, startCt: 35,
    recipe: { resources: { copper: 10, quartz: 4 } },
    desc: 'Soldier only. Sprung, charge-storing greaves — act sooner each battle.',
  },
  marksman_rig: {
    id: 'marksman_rig', name: "Marksman's Rig", slot: 'accessory', tier: 1, building: 'workshop', reqLevel: 1,
    job: 'gunner', mods: { attack: 3 }, grantsAbility: 'aimed_shot',
    recipe: { resources: { copper: 8, iron: 4 } },
    desc: 'Gunner only. A steadying harness that grants the Aimed Shot technique.',
  },
  recoil_harness: {
    id: 'recoil_harness', name: 'Recoil Harness', slot: 'armor', tier: 2, building: 'workshop', reqLevel: 2,
    job: 'gunner', mods: { defense: 5, maxHp: 12 }, steamRegen: 1,
    recipe: { resources: { copper: 14, iron: 8 } },
    desc: 'Gunner only. Absorbs recoil and recycles pressure.',
  },
  dynamo_core: {
    id: 'dynamo_core', name: 'Dynamo Core', slot: 'accessory', tier: 2, building: 'workshop', reqLevel: 2,
    job: 'engineer', mods: { tech: 4, maxSteam: 6 }, steamRegen: 3,
    recipe: { resources: { copper: 12, quartz: 6 } },
    desc: 'Engineer only. A humming core that keeps the boiler topped up.',
  },
  tool_harness: {
    id: 'tool_harness', name: 'Tool Harness', slot: 'armor', tier: 1, building: 'workshop', reqLevel: 1,
    job: 'engineer', mods: { defense: 4, maxHp: 8 }, grantsAbility: 'mend_field',
    recipe: { resources: { copper: 10, iron: 4 } },
    desc: 'Engineer only. A rig of tools that grants the Mend Field repair burst.',
  },

  // --- Advanced-job gear (only visible once the job is unlocked) ---
  dragoon_lance: {
    id: 'dragoon_lance', name: 'Dragoon Lance', slot: 'weapon', tier: 3, building: 'gunsmith', reqLevel: 1,
    job: 'dragoon', mods: { attack: 12 }, grantsAbility: 'jump_attack',
    recipe: { resources: { quartz: 8, iron: 14 } },
    desc: 'Dragoon only. A telescoping lance built for the leap.',
  },
  sentinel_aegis: {
    id: 'sentinel_aegis', name: 'Sentinel Aegis', slot: 'armor', tier: 3, building: 'workshop', reqLevel: 2,
    job: 'sentinel', mods: { defense: 12, maxHp: 20 }, grantsAbility: 'guard',
    recipe: { resources: { copper: 18, iron: 16, quartz: 6 } },
    desc: 'Sentinel only. An immovable slab of plate that grants Guard.',
  },
  artificer_reactor: {
    id: 'artificer_reactor', name: 'Artificer Reactor', slot: 'accessory', tier: 3, building: 'workshop', reqLevel: 2,
    job: 'artificer', mods: { tech: 8, maxSteam: 10 }, steamRegen: 4,
    recipe: { resources: { quartz: 14, copper: 12 } },
    desc: 'Artificer only. A miniature boiler-reactor of tremendous output.',
  },
}

export const ITEM_ORDER: string[] = [
  'iron_saber', 'flintlock_carbine', 'spanner',
  'steel_saber', 'pneumatic_rifle', 'powered_wrench',
  'tempered_greatblade', 'repeating_rifle', 'dynamo_wrench',
  'riveted_vest', 'brass_goggles',
  'plated_cuirass', 'pressure_regulator',
  'aegis_plate', 'charged_greaves', 'marksman_rig', 'recoil_harness', 'dynamo_core', 'tool_harness',
  'dragoon_lance', 'sentinel_aegis', 'artificer_reactor',
]
