import { BUILDINGS } from '../../data/buildings'
import { ITEMS } from '../../data/items'
import type { GameState } from '../../types'
import { activeBuildingLevel, canAfford } from './buildings'

export function ownedCount(game: GameState, itemId: string): number {
  return game.inventory[itemId] ?? 0
}

/**
 * Why an item can't be crafted right now, or null if it can.
 * Used both for gating and to show the player a reason.
 */
export function craftBlocker(game: GameState, itemId: string): string | null {
  const def = ITEMS[itemId]
  if (!def) return 'Unknown item.'

  const level = activeBuildingLevel(game, def.building)
  const buildingName = BUILDINGS[def.building].name
  if (level < def.reqLevel) {
    return `Needs ${buildingName} Lv${def.reqLevel}`
  }
  if (def.recipe.upgradeFrom && ownedCount(game, def.recipe.upgradeFrom) < 1) {
    return `Needs a spare ${ITEMS[def.recipe.upgradeFrom].name}`
  }
  if (!canAfford(game, def.recipe.resources)) {
    return 'Not enough resources'
  }
  return null
}

export function canCraft(game: GameState, itemId: string): boolean {
  return craftBlocker(game, itemId) === null
}

export function craft(game: GameState, itemId: string): GameState {
  if (!canCraft(game, itemId)) return game
  const def = ITEMS[itemId]
  const next: GameState = structuredClone(game)

  for (const [r, n] of Object.entries(def.recipe.resources)) {
    next.resources[r as keyof typeof next.resources] -= n ?? 0
  }
  if (def.recipe.upgradeFrom) {
    next.inventory[def.recipe.upgradeFrom] = (next.inventory[def.recipe.upgradeFrom] ?? 0) - 1
    if (next.inventory[def.recipe.upgradeFrom] <= 0) delete next.inventory[def.recipe.upgradeFrom]
  }
  next.inventory[itemId] = (next.inventory[itemId] ?? 0) + 1
  return next
}
