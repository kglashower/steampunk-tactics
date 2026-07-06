import { ITEMS, type ItemMods } from '../../data/items'
import { JOB_GROWTH, JOB_TEMPLATES } from '../../data/units'
import { ABILITIES } from '../battle/abilities'
import type { UnitStats } from '../battle/types'
import type { Character, EquipSlot, GameState } from '../../types'

const MOD_KEYS: (keyof ItemMods)[] = ['attack', 'defense', 'maxHp', 'maxSteam', 'tech']

/**
 * A character's battle stats = job template + per-level growth + equipped mods
 * + slotted passive and movement ability bonuses. HP and Steam start full.
 */
export function characterStats(char: Character): UnitStats {
  const t = JOB_TEMPLATES[char.job]
  const g = JOB_GROWTH[char.job]
  const lv = Math.max(0, char.level - 1)
  const s: UnitStats = {
    maxHp: t.maxHp + g.maxHp * lv, hp: t.maxHp,
    maxSteam: t.maxSteam + g.maxSteam * lv, steam: t.maxSteam,
    speed: t.speed,
    attack: t.attack + g.attack * lv,
    defense: t.defense + g.defense * lv,
    tech: t.tech + g.tech * lv,
    move: t.move, jump: t.jump, steamRegen: 2, hover: false,
  }
  for (const itemId of Object.values(char.equipment)) {
    const def = itemId ? ITEMS[itemId] : undefined
    if (!def) continue
    for (const key of MOD_KEYS) {
      const bonus = def.mods[key]
      if (bonus) s[key] += bonus
    }
    if (def.steamRegen) s.steamRegen += def.steamRegen
  }

  // Slotted passive ability bonuses.
  const passive = char.loadout.passive ? ABILITIES[char.loadout.passive]?.passiveMods : undefined
  if (passive) {
    for (const key of MOD_KEYS) if (passive[key]) s[key] += passive[key]!
    if (passive.steamRegen) s.steamRegen += passive.steamRegen
  }

  // Slotted movement ability modifiers.
  const move = char.loadout.movement ? ABILITIES[char.loadout.movement]?.moveMods : undefined
  if (move) {
    if (move.move) s.move += move.move
    if (move.jump) s.jump += move.jump
    if (move.hover) s.hover = true
  }

  s.hp = s.maxHp
  s.steam = s.maxSteam
  return s
}

/** Starting Charge Time from equipped gear (a "haste" head start). */
export function characterStartCt(char: Character): number {
  let ct = 0
  for (const itemId of Object.values(char.equipment)) {
    const def = itemId ? ITEMS[itemId] : undefined
    if (def?.startCt) ct += def.startCt
  }
  return ct
}

/** Can this character equip this item (slot + job lock)? */
export function canEquip(char: Character, itemId: string): boolean {
  const def = ITEMS[itemId]
  if (!def) return false
  if (def.job && def.job !== char.job) return false
  return true
}

/** Total stat bonus from a character's gear (for UI display). */
export function equipmentBonus(char: Character): ItemMods {
  const total: ItemMods = {}
  for (const itemId of Object.values(char.equipment)) {
    const def = itemId ? ITEMS[itemId] : undefined
    if (!def) continue
    for (const key of MOD_KEYS) {
      if (def.mods[key]) total[key] = (total[key] ?? 0) + def.mods[key]!
    }
  }
  return total
}

/** Equip an item from inventory; any item already in that slot returns to inventory. */
export function equip(game: GameState, charId: string, itemId: string): GameState {
  const def = ITEMS[itemId]
  const char = game.roster[charId]
  if (!def || !char) return game
  if ((game.inventory[itemId] ?? 0) < 1) return game
  if (!canEquip(char, itemId)) return game // job-locked

  const next: GameState = structuredClone(game)
  const c = next.roster[charId]
  const slot = def.slot

  const prev = c.equipment[slot]
  if (prev) next.inventory[prev] = (next.inventory[prev] ?? 0) + 1

  next.inventory[itemId] -= 1
  if (next.inventory[itemId] <= 0) delete next.inventory[itemId]

  c.equipment[slot] = itemId
  return next
}

/** Remove the item in a slot, returning it to inventory. */
export function unequip(game: GameState, charId: string, slot: EquipSlot): GameState {
  const char = game.roster[charId]
  if (!char || !char.equipment[slot]) return game
  const next: GameState = structuredClone(game)
  const c = next.roster[charId]
  const itemId = c.equipment[slot]!
  next.inventory[itemId] = (next.inventory[itemId] ?? 0) + 1
  delete c.equipment[slot]
  return next
}
