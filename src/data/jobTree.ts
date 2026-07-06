import type { JobId } from '../types'

export interface LearnNode {
  /** Ability id this node teaches. */
  ability: string
  /** Job Points to learn. */
  cost: number
}

/**
 * Abilities each job can teach. A character may learn from any job they've
 * unlocked; a learned ability joins their pool and can be slotted into a
 * matching loadout slot. Abilities appearing in several jobs are learned once.
 */
export const JOB_LEARN: Record<JobId, LearnNode[]> = {
  soldier: [
    { ability: 'bulwark', cost: 100 },
    { ability: 'power_strike', cost: 120 },
    { ability: 'toughness', cost: 150 },
    { ability: 'guard', cost: 200 },
    { ability: 'sprint', cost: 120 },
  ],
  gunner: [
    { ability: 'aimed_shot', cost: 100 },
    { ability: 'suppress', cost: 120 },
    { ability: 'focus', cost: 150 },
    { ability: 'sprint', cost: 120 },
  ],
  engineer: [
    { ability: 'field_repair', cost: 100 },
    { ability: 'overcharge', cost: 120 },
    { ability: 'overclock', cost: 150 },
    { ability: 'mend_field', cost: 200 },
  ],
  dragoon: [
    { ability: 'jump_attack', cost: 150 },
    { ability: 'power_strike', cost: 120 },
    { ability: 'sure_foot', cost: 150 },
    { ability: 'hover', cost: 350 },
  ],
  sentinel: [
    { ability: 'guard', cost: 150 },
    { ability: 'counter', cost: 280 },
    { ability: 'plating', cost: 150 },
    { ability: 'shield_breaker', cost: 200 },
    { ability: 'battle_hardened', cost: 350 },
  ],
  sniper: [
    { ability: 'snipe', cost: 280 },
    { ability: 'aimed_shot', cost: 100 },
    { ability: 'focus', cost: 150 },
    { ability: 'long_stride', cost: 200 },
  ],
  grenadier: [
    { ability: 'scattershot', cost: 200 },
    { ability: 'frag_grenade', cost: 250 },
    { ability: 'plating', cost: 150 },
  ],
  machinist: [
    { ability: 'overcharge', cost: 120 },
    { ability: 'emp_blast', cost: 280 },
    { ability: 'plating', cost: 150 },
    { ability: 'overclock', cost: 150 },
  ],
  medic: [
    { ability: 'field_repair', cost: 100 },
    { ability: 'mend_field', cost: 200 },
    { ability: 'fortify', cost: 220 },
  ],
  warlord: [
    { ability: 'warcry', cost: 300 },
    { ability: 'rally', cost: 220 },
    { ability: 'battle_hardened', cost: 300 },
    { ability: 'counter', cost: 280 },
  ],
  sharpshooter: [
    { ability: 'deadeye', cost: 220 },
    { ability: 'snipe', cost: 280 },
    { ability: 'long_stride', cost: 200 },
    { ability: 'focus', cost: 150 },
  ],
  artificer: [
    { ability: 'emp_blast', cost: 280 },
    { ability: 'mend_field', cost: 200 },
    { ability: 'overclock', cost: 150 },
    { ability: 'hover', cost: 350 },
  ],
}
