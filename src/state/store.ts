import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'
import type { BuildingType, EquipSlot, GameState, JobId, ScreenId } from '../types'
import { createInitialState } from '../data/initialState'
import { BUILDINGS } from '../data/buildings'
import { ITEMS } from '../data/items'
import { JOBS } from '../data/jobs'
import { createBattle } from '../engine/battle/battle'
import { ABILITIES } from '../engine/battle/abilities'
import type { BattleState } from '../engine/battle/types'
import { build, upgrade } from '../engine/economy/buildings'
import { craft } from '../engine/economy/crafting'
import { equip, unequip } from '../engine/economy/equipment'
import { RECRUITS } from '../data/recruits'
import { awardBattleXp } from '../engine/progression/leveling'
import { learnAbility, setLoadout, switchJob, unlockJob } from '../engine/progression/jobs'
import { buildWorldBattle } from '../engine/world/encounterBuilder'
import { availableParty, isAttackable } from '../engine/world/territory'
import { resolveEndTurn, type TurnSummary } from '../engine/world/turnResolution'
import { clearSave, saveGame } from './persistence'

/** A transient, in-progress tactical battle (not part of the saved game). */
export interface BattleSession {
  kind: 'attack'
  territoryId: string
  state: BattleState
}

/** A transient success/notice message shown briefly to the player. */
export interface Toast {
  id: number
  text: string
}

interface GameStore {
  game: GameState
  screen: ScreenId
  ready: boolean
  battle: BattleSession | null
  lastSummary: TurnSummary | null
  toast: Toast | null

  dismissToast: () => void
  setScreen: (screen: ScreenId) => void
  hydrate: (game: GameState) => void
  newGame: () => void
  endTurn: () => void

  // Garrisons
  assignGarrison: (territoryId: string, charId: string) => void
  unassignGarrison: (charId: string) => void

  // Economy
  buildBuilding: (territoryId: string, type: BuildingType) => void
  upgradeBuilding: (territoryId: string, type: BuildingType) => void
  craftItem: (itemId: string) => void
  equipItem: (charId: string, itemId: string) => void
  unequipItem: (charId: string, slot: EquipSlot) => void

  // Jobs & abilities
  learnAbilityFor: (charId: string, ability: string) => void
  unlockJobFor: (charId: string, job: JobId) => void
  switchJobFor: (charId: string, job: JobId) => void
  setLoadoutSlot: (charId: string, slot: string, ability: string | null) => void

  // Battles
  startAttack: (territoryId: string, partyIds?: string[]) => void
  setBattleState: (state: BattleState) => void
  finishBattle: () => void
}

/** Max crew that can deploy into one battle. */
export const MAX_PARTY = 5

let toastSeq = 0

/** Commit a new game state and persist it. */
function commit(set: (fn: (s: GameStore) => void) => void, next: GameState) {
  set((s) => {
    s.game = next
  })
  void saveGame(next)
}

export const useGame = create<GameStore>()(
  immer((set, get) => {
    /** Commit only if the transform changed something, and show a toast. */
    const commitNotify = (next: GameState, text: string) => {
      if (next === get().game) return // no-op transform (e.g., unaffordable)
      set((s) => {
        s.game = next
        s.toast = { id: ++toastSeq, text }
      })
      void saveGame(next)
    }

    return {
    game: createInitialState(),
    screen: 'map',
    ready: false,
    battle: null,
    lastSummary: null,
    toast: null,

    dismissToast: () =>
      set((s) => {
        s.toast = null
      }),

    setScreen: (screen) =>
      set((s) => {
        s.screen = screen
      }),

    hydrate: (game) =>
      set((s) => {
        s.game = game
        s.ready = true
      }),

    newGame: () => {
      const fresh = createInitialState()
      set((s) => {
        s.game = fresh
        s.battle = null
        s.lastSummary = null
        s.ready = true
      })
      void clearSave().then(() => saveGame(fresh))
    },

    endTurn: () => {
      const { game, summary } = resolveEndTurn(get().game, Math.random)
      set((s) => {
        s.game = game
        s.lastSummary = summary
      })
      void saveGame(game)
    },

    assignGarrison: (territoryId, charId) =>
      set((s) => {
        // A character can be in only one garrison; remove from any others first.
        for (const t of Object.values(s.game.territories)) {
          t.garrison = t.garrison.filter((id) => id !== charId)
        }
        const target = s.game.territories[territoryId]
        if (target && target.owner === 'player') target.garrison.push(charId)
      }),

    unassignGarrison: (charId) =>
      set((s) => {
        for (const t of Object.values(s.game.territories)) {
          t.garrison = t.garrison.filter((id) => id !== charId)
        }
      }),

    buildBuilding: (territoryId, type) =>
      commitNotify(build(get().game, territoryId, type), `Built ${BUILDINGS[type].name}`),
    upgradeBuilding: (territoryId, type) =>
      commitNotify(upgrade(get().game, territoryId, type), `Upgraded ${BUILDINGS[type].name}`),
    craftItem: (itemId) =>
      commitNotify(craft(get().game, itemId), `Crafted ${ITEMS[itemId]?.name ?? 'item'}`),
    equipItem: (charId, itemId) => commit(set, equip(get().game, charId, itemId)),
    unequipItem: (charId, slot) => commit(set, unequip(get().game, charId, slot)),
    learnAbilityFor: (charId, ability) =>
      commitNotify(learnAbility(get().game, charId, ability), `Learned ${ABILITIES[ability]?.name ?? 'ability'}`),
    unlockJobFor: (charId, job) =>
      commitNotify(unlockJob(get().game, charId, job), `Unlocked ${JOBS[job].name}`),
    switchJobFor: (charId, job) =>
      commitNotify(switchJob(get().game, charId, job), `Now a ${JOBS[job].name}`),
    setLoadoutSlot: (charId, slot, ability) => commit(set, setLoadout(get().game, charId, slot, ability)),

    startAttack: (territoryId, partyIds) => {
      const game = get().game
      if (!isAttackable(game, territoryId)) return
      const available = availableParty(game)
      // Use the chosen party (filtered to valid, available crew) or all available.
      let party = partyIds
        ? partyIds.map((id) => available.find((c) => c.id === id)).filter((c): c is NonNullable<typeof c> => !!c)
        : available
      party = party.slice(0, MAX_PARTY)
      if (party.length === 0) return
      const config = buildWorldBattle(party, game.territories[territoryId])
      const state = createBattle(config)
      set((s) => {
        s.battle = { kind: 'attack', territoryId, state }
      })
    },

    setBattleState: (state) =>
      set((s) => {
        if (s.battle) s.battle.state = state
      }),

    finishBattle: () => {
      const battle = get().battle
      if (!battle) return
      const won = battle.state.phase === 'won'
      // Award XP for a victory before clearing the battle.
      const nextGame = won ? awardBattleXp(get().game, battle.state).game : get().game
      set((s) => {
        s.game = nextGame
        if (won) {
          const t = s.game.territories[battle.territoryId]
          t.owner = 'player'
          t.overrun = false
          // Recruit reward on first claim of certain territories.
          const recruit = RECRUITS[battle.territoryId]
          if (recruit && !s.game.roster[recruit.id]) {
            s.game.roster[recruit.id] = {
              id: recruit.id,
              name: recruit.name,
              job: recruit.job,
              level: 1,
              xp: 0,
              jp: 0,
              unlockedJobs: ['soldier', 'gunner', 'engineer'],
              unlocked: [],
              loadout: { actions: [null, null], reaction: null, passive: null, movement: null },
              equipment: {},
            }
          }
        }
        s.battle = null
        s.screen = 'map'
      })
      void saveGame(get().game)
    },
    }
  }),
)

// Dev-only: expose the store for debugging in the browser console.
if (import.meta.env.DEV) {
  ;(globalThis as unknown as { useGame?: typeof useGame }).useGame = useGame
}
