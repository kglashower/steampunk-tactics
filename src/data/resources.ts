import type { ResourceType } from '../types'

export interface ResourceDef {
  id: ResourceType
  name: string
  /** Short symbol used in the HUD before real art exists. */
  glyph: string
  blurb: string
}

export const RESOURCES: Record<ResourceType, ResourceDef> = {
  coal: { id: 'coal', name: 'Coal', glyph: '◆', blurb: 'Fuel for forges, boilers, and buildings.' },
  iron: { id: 'iron', name: 'Iron', glyph: '▰', blurb: 'Structural metal for weapons and frames.' },
  copper: { id: 'copper', name: 'Copper', glyph: '◉', blurb: 'Wiring and precision parts for armor and accessories.' },
  quartz: { id: 'quartz', name: 'Quartz', glyph: '◈', blurb: 'Precision crystal for advanced weaponry.' },
}

export const RESOURCE_ORDER: ResourceType[] = ['coal', 'iron', 'copper', 'quartz']

/** Base amount a single owned, non-overrun territory yields per turn. */
export const BASE_PRODUCTION = 3
