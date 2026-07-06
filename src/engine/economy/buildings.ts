import { BUILDINGS, type ResourceCost } from '../../data/buildings'
import type { BuildingType, GameState } from '../../types'

/** Can the player currently pay a resource cost? */
export function canAfford(game: GameState, cost: ResourceCost): boolean {
  return Object.entries(cost).every(([r, n]) => game.resources[r as keyof typeof game.resources] >= (n ?? 0))
}

function payCost(game: GameState, cost: ResourceCost): void {
  for (const [r, n] of Object.entries(cost)) {
    game.resources[r as keyof typeof game.resources] -= n ?? 0
  }
}

/** Building types that can be constructed on a territory right now (allowed type, owned, active, not already built). */
export function buildableTypes(game: GameState, territoryId: string): BuildingType[] {
  const t = game.territories[territoryId]
  if (!t || t.owner !== 'player' || t.overrun) return []
  return Object.values(BUILDINGS)
    .filter((b) => b.allowed === t.type && !t.buildings.some((inst) => inst.type === b.id))
    .map((b) => b.id)
}

export function canBuild(game: GameState, territoryId: string, type: BuildingType): boolean {
  if (!buildableTypes(game, territoryId).includes(type)) return false
  return canAfford(game, BUILDINGS[type].levelCost[0])
}

export function build(game: GameState, territoryId: string, type: BuildingType): GameState {
  if (!canBuild(game, territoryId, type)) return game
  const next: GameState = structuredClone(game)
  payCost(next, BUILDINGS[type].levelCost[0])
  next.territories[territoryId].buildings.push({ type, level: 1 })
  return next
}

function instanceOf(game: GameState, territoryId: string, type: BuildingType) {
  return game.territories[territoryId]?.buildings.find((b) => b.type === type)
}

export function canUpgrade(game: GameState, territoryId: string, type: BuildingType): boolean {
  const t = game.territories[territoryId]
  if (!t || t.owner !== 'player' || t.overrun) return false
  const inst = instanceOf(game, territoryId, type)
  const def = BUILDINGS[type]
  if (!inst || inst.level >= def.maxLevel) return false
  return canAfford(game, def.levelCost[inst.level]) // levelCost[level] upgrades to level+1
}

export function upgrade(game: GameState, territoryId: string, type: BuildingType): GameState {
  if (!canUpgrade(game, territoryId, type)) return game
  const next: GameState = structuredClone(game)
  const inst = next.territories[territoryId].buildings.find((b) => b.type === type)!
  payCost(next, BUILDINGS[type].levelCost[inst.level])
  inst.level += 1
  return next
}

/**
 * Highest level of a building across all owned, active territories — i.e. the
 * crafting capability available to the player (overrun territories don't count).
 */
export function activeBuildingLevel(game: GameState, type: BuildingType): number {
  let best = 0
  for (const t of Object.values(game.territories)) {
    if (t.owner !== 'player' || t.overrun) continue
    for (const b of t.buildings) {
      if (b.type === type) best = Math.max(best, b.level)
    }
  }
  return best
}
