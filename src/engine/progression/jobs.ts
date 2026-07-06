import { ITEMS } from '../../data/items'
import { JOBS, JOB_BASIC } from '../../data/jobs'
import { JOB_LEARN, type LearnNode } from '../../data/jobTree'
import { ABILITIES, abilitySlot } from '../battle/abilities'
import type { AbilitySlot, Character, GameState, JobId, Loadout } from '../../types'

// ---------------------------------------------------------------------------
// Learning abilities
// ---------------------------------------------------------------------------

/** The abilities a character can currently learn (union across unlocked jobs). */
export function learnset(char: Character): LearnNode[] {
  const seen = new Map<string, LearnNode>()
  for (const job of char.unlockedJobs) {
    for (const node of JOB_LEARN[job]) {
      const existing = seen.get(node.ability)
      if (!existing || node.cost < existing.cost) seen.set(node.ability, node)
    }
  }
  return [...seen.values()]
}

function learnNode(char: Character, ability: string): LearnNode | undefined {
  return learnset(char).find((n) => n.ability === ability)
}

export function learnBlocker(char: Character, ability: string): string | null {
  if (char.unlocked.includes(ability)) return 'Already learned'
  const node = learnNode(char, ability)
  if (!node) return 'Not offered by your jobs'
  if (char.jp < node.cost) return `Needs ${node.cost} JP`
  return null
}

export function canLearn(char: Character, ability: string): boolean {
  return learnBlocker(char, ability) === null
}

/** Spend JP to learn an ability into the character's pool. */
export function learnAbility(game: GameState, charId: string, ability: string): GameState {
  const char = game.roster[charId]
  if (!char || !canLearn(char, ability)) return game
  const node = learnNode(char, ability)!
  const next: GameState = structuredClone(game)
  const c = next.roster[charId]
  c.jp -= node.cost
  c.unlocked.push(ability)
  return next
}

// ---------------------------------------------------------------------------
// Job tree: unlock, switch, visibility
// ---------------------------------------------------------------------------

/** How many abilities the character has learned from a job's learnset. */
function learnedFrom(char: Character, job: JobId): number {
  const ids = new Set(JOB_LEARN[job].map((n) => n.ability))
  return char.unlocked.filter((a) => ids.has(a)).length
}

export function jobUnlockBlocker(char: Character, job: JobId): string | null {
  const def = JOBS[job]
  if (char.unlockedJobs.includes(job)) return 'Already unlocked'
  for (const req of def.requires) {
    if (!char.unlockedJobs.includes(req)) return `Requires ${JOBS[req].name}`
  }
  if (def.reqAbilities > 0) {
    const learned = def.requires.reduce((sum, r) => sum + learnedFrom(char, r), 0)
    if (learned < def.reqAbilities) {
      return `Learn ${def.reqAbilities} abilities from ${def.requires.map((r) => JOBS[r].name).join('/')}`
    }
  }
  if (char.jp < def.jpCost) return `Needs ${def.jpCost} JP`
  return null
}

export function canUnlockJob(char: Character, job: JobId): boolean {
  return jobUnlockBlocker(char, job) === null
}

/** A job is shown once it's unlocked or its prerequisite jobs are all unlocked. */
export function jobVisible(char: Character, job: JobId): boolean {
  if (char.unlockedJobs.includes(job)) return true
  return JOBS[job].requires.every((r) => char.unlockedJobs.includes(r))
}

export function unlockJob(game: GameState, charId: string, job: JobId): GameState {
  const char = game.roster[charId]
  if (!char || !canUnlockJob(char, job)) return game
  const next: GameState = structuredClone(game)
  const c = next.roster[charId]
  c.jp -= JOBS[job].jpCost
  c.unlockedJobs.push(job)
  return next
}

export function switchJob(game: GameState, charId: string, job: JobId): GameState {
  const char = game.roster[charId]
  if (!char || !char.unlockedJobs.includes(job)) return game
  const next: GameState = structuredClone(game)
  next.roster[charId].job = job
  return next
}

// ---------------------------------------------------------------------------
// Loadout
// ---------------------------------------------------------------------------

/** Which loadout category an ability belongs to (or null if unknown). */
export function abilityCategory(ability: string): AbilitySlot | null {
  const def = ABILITIES[ability]
  return def ? abilitySlot(def) : null
}

/** Learned abilities of a given slot category, for the loadout picker. */
export function learnedForSlot(char: Character, slot: AbilitySlot): string[] {
  return char.unlocked.filter((a) => abilityCategory(a) === slot)
}

/**
 * Set a loadout slot. `slot` is 'action0'|'action1'|'reaction'|'passive'|'movement'.
 * Passing null clears it. Validates the ability is learned and matches the slot.
 */
export function setLoadout(game: GameState, charId: string, slot: string, ability: string | null): GameState {
  const char = game.roster[charId]
  if (!char) return game
  if (ability && !char.unlocked.includes(ability)) return game

  const category: AbilitySlot | null =
    slot === 'action0' || slot === 'action1' ? 'action' : (slot as AbilitySlot)
  if (ability && abilityCategory(ability) !== category) return game

  const next: GameState = structuredClone(game)
  const l = next.roster[charId].loadout
  if (slot === 'action0') l.actions[0] = ability
  else if (slot === 'action1') l.actions[1] = ability
  else if (slot === 'reaction') l.reaction = ability
  else if (slot === 'passive') l.passive = ability
  else if (slot === 'movement') l.movement = ability
  // Prevent slotting the same action in both action slots.
  if (slot === 'action0' && ability && l.actions[1] === ability) l.actions[1] = null
  if (slot === 'action1' && ability && l.actions[0] === ability) l.actions[0] = null
  return next
}

// ---------------------------------------------------------------------------
// Battle derivation
// ---------------------------------------------------------------------------

/** The action-menu abilities a character brings into battle. */
export function characterActions(char: Character): string[] {
  const out = new Set<string>()
  out.add(JOB_BASIC[char.job]) // always-available basic attack
  for (const a of char.loadout.actions) {
    if (a && char.unlocked.includes(a) && abilityCategory(a) === 'action') out.add(a)
  }
  // Gear-granted actions.
  for (const itemId of Object.values(char.equipment)) {
    const granted = itemId ? ITEMS[itemId]?.grantsAbility : undefined
    if (granted && abilityCategory(granted) === 'action') out.add(granted)
  }
  out.add('wait')
  return [...out]
}

/** The slotted reaction id a character brings into battle (if learned). */
export function characterReaction(char: Character): string | undefined {
  const r = char.loadout.reaction
  return r && char.unlocked.includes(r) ? r : undefined
}

/** A fresh empty loadout. */
export function emptyLoadout(): Loadout {
  return { actions: [null, null], reaction: null, passive: null, movement: null }
}
