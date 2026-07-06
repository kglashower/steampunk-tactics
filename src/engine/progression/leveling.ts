import type { BattleState, BattleUnit } from '../battle/types'
import type { Character, GameState } from '../../types'

export const MAX_LEVEL = 20

/** XP required to advance from `level` to `level + 1`. */
export function xpToNext(level: number): number {
  return 50 + 50 * level
}

/** Add XP to a character (mutates), leveling up as thresholds are crossed. */
export function addXp(char: Character, amount: number): void {
  char.xp += Math.max(0, amount)
  while (char.level < MAX_LEVEL && char.xp >= xpToNext(char.level)) {
    char.xp -= xpToNext(char.level)
    char.level += 1
  }
  if (char.level >= MAX_LEVEL) char.xp = 0
}

/** XP a single enemy unit is worth, scaled by its bulk and power. */
export function unitXpValue(unit: BattleUnit): number {
  return Math.round(unit.stats.maxHp * 0.5 + unit.stats.attack)
}

export interface XpReward {
  charId: string
  name: string
  gained: number
  jpGained: number
  fromLevel: number
  toLevel: number
}

/**
 * Award XP and Job Points to the player party for a won battle. Each
 * participating crew member earns the battle's full enemy-XP total (and an
 * equal amount of JP). Pure: returns a new game + a summary (deterministic, so
 * it can also be used to preview rewards).
 */
export function awardBattleXp(game: GameState, battle: BattleState): { game: GameState; rewards: XpReward[] } {
  const enemyXp = Object.values(battle.units)
    .filter((u) => u.team === 'enemy')
    .reduce((sum, u) => sum + unitXpValue(u), 0)

  const next: GameState = structuredClone(game)
  const rewards: XpReward[] = []

  for (const unit of Object.values(battle.units)) {
    if (unit.team !== 'player') continue
    const ch = next.roster[unit.id]
    if (!ch) continue
    const fromLevel = ch.level
    addXp(ch, enemyXp)
    ch.jp += enemyXp
    rewards.push({ charId: ch.id, name: ch.name, gained: enemyXp, jpGained: enemyXp, fromLevel, toLevel: ch.level })
  }

  return { game: next, rewards }
}
