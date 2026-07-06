import type { JobId } from '../types'

export interface RecruitSeed {
  id: string
  name: string
  job: JobId
}

/**
 * Crew gained the first time a territory is claimed. Keyed by territory id.
 * Lets the roster grow so you can both garrison and field a party on a big map.
 */
export const RECRUITS: Record<string, RecruitSeed> = {
  'old-foundry': { id: 'r-mirren', name: 'Mirren', job: 'soldier' },
  ashfields: { id: 'r-sable', name: 'Sable', job: 'gunner' },
  'patina-gorge': { id: 'r-voss', name: 'Voss', job: 'engineer' },
  'the-scrapyard': { id: 'r-korrin', name: 'Korrin', job: 'soldier' },
}
