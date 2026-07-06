import { openDB, type DBSchema, type IDBPDatabase } from 'idb'
import type { GameState } from '../types'
import { SAVE_VERSION } from '../data/initialState'

interface SteampunkDB extends DBSchema {
  saves: {
    key: string
    value: GameState
  }
}

const DB_NAME = 'steampunk-tactics'
const DB_VERSION = 1
const STORE = 'saves'
const SLOT = 'main' // single save slot for the MVP

let dbPromise: Promise<IDBPDatabase<SteampunkDB>> | null = null

function getDB() {
  if (!dbPromise) {
    dbPromise = openDB<SteampunkDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE)) {
          db.createObjectStore(STORE)
        }
      },
    })
  }
  return dbPromise
}

/** Persist the game state to the single save slot. */
export async function saveGame(state: GameState): Promise<void> {
  const db = await getDB()
  await db.put(STORE, state, SLOT)
}

/**
 * Load the saved game, or null if there is none.
 * Saves from an older schema version are discarded until migrations exist.
 */
/** Defensive shape check so a partial/corrupt save can't crash the app. */
function isValidSave(state: unknown): state is GameState {
  if (!state || typeof state !== 'object') return false
  const g = state as Partial<GameState>
  if (g.version !== SAVE_VERSION) return false
  if (typeof g.turn !== 'number') return false
  if (!g.resources || !g.territories || !g.roster || !g.inventory) return false
  // Every territory must carry the fields the UI relies on.
  const territoriesOk = Object.values(g.territories).every(
    (t) => Array.isArray(t.buildings) && Array.isArray(t.garrison) && Array.isArray(t.adjacency),
  )
  const rosterOk = Object.values(g.roster).every(
    (c) =>
      typeof c.level === 'number' &&
      typeof c.xp === 'number' &&
      typeof c.jp === 'number' &&
      Array.isArray(c.unlocked) &&
      Array.isArray(c.unlockedJobs) &&
      c.loadout != null &&
      Array.isArray(c.loadout.actions) &&
      c.equipment != null,
  )
  return territoriesOk && rosterOk
}

export async function loadGame(): Promise<GameState | null> {
  try {
    const db = await getDB()
    const state = await db.get(STORE, SLOT)
    // Discard anything that isn't a complete, current-version save. New game
    // starts instead — no migrations for the MVP.
    return isValidSave(state) ? state : null
  } catch {
    return null
  }
}

/** Delete the save (used by "New Game"). */
export async function clearSave(): Promise<void> {
  const db = await getDB()
  await db.delete(STORE, SLOT)
}
