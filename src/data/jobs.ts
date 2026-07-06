import type { JobId } from '../types'

export interface JobDef {
  id: JobId
  name: string
  role: string
  blurb: string
  tier: 1 | 2 | 3
  /** Tree parent (for layout); roots have none. */
  parent?: JobId
  /** Jobs that must be unlocked before this one becomes available. */
  requires: JobId[]
  /** Learned-ability threshold across the required jobs to unlock. */
  reqAbilities: number
  /** JP cost to unlock (0 for roots — unlocked from the start). */
  jpCost: number
}

// Pure steampunk technology — no magic. A branching job tree: three roots
// (always unlocked), each with two tier-2 jobs, capped by a tier-3 capstone
// that requires mastering both branches.
export const JOBS: Record<JobId, JobDef> = {
  // --- Roots (tier 1) ---
  soldier: {
    id: 'soldier', name: 'Soldier', role: 'Frontline', tier: 1, requires: [], reqAbilities: 0, jpCost: 0,
    blurb: 'High HP and defense. Holds the line with saber and bayonet.',
  },
  gunner: {
    id: 'gunner', name: 'Gunner', role: 'Ranged', tier: 1, requires: [], reqAbilities: 0, jpCost: 0,
    blurb: 'Fragile but deadly at range. Loves the high ground.',
  },
  engineer: {
    id: 'engineer', name: 'Engineer', role: 'Support / Tech', tier: 1, requires: [], reqAbilities: 0, jpCost: 0,
    blurb: 'Deploys gadgets and repairs allies in the field.',
  },

  // --- Tier 2 ---
  dragoon: {
    id: 'dragoon', name: 'Dragoon', role: 'Leaper', tier: 2, parent: 'soldier', requires: ['soldier'], reqAbilities: 2, jpCost: 250,
    blurb: 'A lance-armed jumper that vaults across terrain and crashes down on foes.',
  },
  sentinel: {
    id: 'sentinel', name: 'Sentinel', role: 'Bulwark', tier: 2, parent: 'soldier', requires: ['soldier'], reqAbilities: 2, jpCost: 250,
    blurb: 'An immovable guardian: guards, counters, and shields the line.',
  },
  sniper: {
    id: 'sniper', name: 'Sniper', role: 'Marksman', tier: 2, parent: 'gunner', requires: ['gunner'], reqAbilities: 2, jpCost: 250,
    blurb: 'Extreme range and precision — picks off targets from afar.',
  },
  grenadier: {
    id: 'grenadier', name: 'Grenadier', role: 'Demolitions', tier: 2, parent: 'gunner', requires: ['gunner'], reqAbilities: 2, jpCost: 250,
    blurb: 'Lobs explosives that scatter across clustered enemies.',
  },
  machinist: {
    id: 'machinist', name: 'Machinist', role: 'Gadgeteer', tier: 2, parent: 'engineer', requires: ['engineer'], reqAbilities: 2, jpCost: 250,
    blurb: 'Turns Tech into raw damage with charged gadgets and EMP bursts.',
  },
  medic: {
    id: 'medic', name: 'Medic', role: 'Healer', tier: 2, parent: 'engineer', requires: ['engineer'], reqAbilities: 2, jpCost: 250,
    blurb: 'Keeps the crew standing with field repairs and reinforcement.',
  },

  // --- Tier 3 capstones ---
  warlord: {
    id: 'warlord', name: 'Warlord', role: 'Commander', tier: 3, parent: 'soldier', requires: ['dragoon', 'sentinel'], reqAbilities: 0, jpCost: 500,
    blurb: 'Master of the soldier branch: rallies the crew and never yields.',
  },
  sharpshooter: {
    id: 'sharpshooter', name: 'Sharpshooter', role: 'Deadeye', tier: 3, parent: 'gunner', requires: ['sniper', 'grenadier'], reqAbilities: 0, jpCost: 500,
    blurb: 'Master of the gunner branch: devastating range and area fire.',
  },
  artificer: {
    id: 'artificer', name: 'Artificer', role: 'Grand Engineer', tier: 3, parent: 'engineer', requires: ['machinist', 'medic'], reqAbilities: 0, jpCost: 500,
    blurb: 'Master of the engineer branch: heals, gadgets, and boiler mastery.',
  },
}

/** Roots are available to everyone from the start. */
export const ROOT_JOBS: JobId[] = ['soldier', 'gunner', 'engineer']

export const JOB_ORDER: JobId[] = [
  'soldier', 'dragoon', 'sentinel', 'warlord',
  'gunner', 'sniper', 'grenadier', 'sharpshooter',
  'engineer', 'machinist', 'medic', 'artificer',
]

/** The always-available basic attack for each job. */
export const JOB_BASIC: Record<JobId, string> = {
  soldier: 'strike', dragoon: 'strike', sentinel: 'strike', warlord: 'strike',
  gunner: 'shoot', sniper: 'shoot', grenadier: 'shoot', sharpshooter: 'shoot',
  engineer: 'wrench_strike', machinist: 'wrench_strike', medic: 'wrench_strike', artificer: 'wrench_strike',
}

/** Advanced jobs reuse their root's sprite silhouette. */
export const JOB_SPRITE: Record<JobId, 'soldier' | 'gunner' | 'engineer'> = {
  soldier: 'soldier', dragoon: 'soldier', sentinel: 'soldier', warlord: 'soldier',
  gunner: 'gunner', sniper: 'gunner', grenadier: 'gunner', sharpshooter: 'gunner',
  engineer: 'engineer', machinist: 'engineer', medic: 'engineer', artificer: 'engineer',
}
