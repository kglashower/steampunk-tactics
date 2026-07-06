import { describe, expect, it } from 'vitest'
import { MONSTER_FAMILIES, MONSTER_TEMPLATES } from '../../data/units'
import type { Territory } from '../../types'
import { attackForce, incursionPower } from './balance'

function territory(type: Territory['type'], tier: number): Territory {
  return {
    id: 't', name: 'T', type, resource: 'iron', owner: 'wild', overrun: false,
    adjacency: [], garrison: [], buildings: [], tier, coord: { x: 0, y: 0 },
  }
}

describe('attackForce', () => {
  it('draws from the biome family', () => {
    const force = attackForce(territory('quartz', 2))
    const quartzUnits = MONSTER_FAMILIES.quartz.tiers
    expect(force.every((k) => quartzUnits.includes(k))).toBe(true)
  })

  it('every monster key resolves to a real template', () => {
    for (const type of ['foundry', 'cinder', 'verdigris', 'quartz'] as const) {
      for (const tier of [0, 1, 2, 3]) {
        for (const key of attackForce(territory(type, tier))) {
          expect(MONSTER_TEMPLATES[key]).toBeDefined()
        }
      }
    }
  })

  it('scales up with tier (outer rings hit harder)', () => {
    const t = (tier: number) => incursionPower(territory('foundry', tier))
    expect(t(3)).toBeGreaterThan(t(1))
    expect(t(2)).toBeGreaterThan(t(1))
  })
})
