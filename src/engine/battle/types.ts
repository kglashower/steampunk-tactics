import type { JobId } from '../../types'

export type Team = 'player' | 'enemy'

export interface Position {
  x: number
  y: number
}

/** A single grid tile. For the MVP, elevation is the only property. */
export interface Tile {
  height: number
}

export interface BattleGrid {
  width: number
  height: number
  /** Row-major: tiles[y][x]. */
  tiles: Tile[][]
}

export interface UnitStats {
  maxHp: number
  hp: number
  maxSteam: number
  steam: number
  speed: number
  attack: number
  defense: number
  tech: number
  move: number
  jump: number
  /** Steam restored at the start of each of the unit's turns. */
  steamRegen: number
  /** Movement ability: ignore height differences when moving. */
  hover: boolean
}

/** A temporary stat modifier (e.g., Bulwark's defense boost, or a debuff). */
export interface Buff {
  id: string
  attack?: number
  defense?: number
  /** Modifier to Speed (negative = Slow). */
  speed?: number
  /** Remaining turns of the affected unit. Ticks down at the start of its turn. */
  turns: number
}

export interface BattleUnit {
  id: string
  name: string
  team: Team
  job?: JobId
  /** Sprite archetype key for the renderer (job id or biome key). */
  sprite?: string
  pos: Position
  stats: UnitStats
  abilities: string[]
  /** Slotted reaction ability id (e.g., 'guard', 'counter'), if any. */
  reaction?: string
  buffs: Buff[]
  /** Charge Time accumulator (acts at >= CT_THRESHOLD). */
  ct: number
  status: 'active' | 'ko'
  /** Per-turn flags, reset when the unit's turn begins. */
  hasMoved: boolean
  hasActed: boolean
}

export type BattlePhase = 'in-progress' | 'won' | 'lost'

export type EventKind = 'info' | 'move' | 'action' | 'damage' | 'heal' | 'ko'

export interface BattleEvent {
  /** Human-readable line for the combat feed. */
  text: string
  kind?: EventKind
}

export interface BattleState {
  grid: BattleGrid
  units: Record<string, BattleUnit>
  /** Id of the unit whose turn it is, or null before the first turn is resolved. */
  activeUnitId: string | null
  phase: BattlePhase
  round: number
  log: BattleEvent[]
}

/** CT needed to take a turn. */
export const CT_THRESHOLD = 100
