import { useEffect, useMemo, useRef, useState } from 'react'
import { getAbility } from '../../engine/battle/abilities'
import { runEnemyTurn } from '../../engine/battle/ai'
import { endTurn, moveUnit, useAbility } from '../../engine/battle/battle'
import { reachableTiles } from '../../engine/battle/pathfinding'
import { abilityTargetKeys, targetUnitAt } from '../../engine/battle/targeting'
import { forecastTurns } from '../../engine/battle/turnOrder'
import type { Position } from '../../engine/battle/types'
import { awardBattleXp } from '../../engine/progression/leveling'
import { RECRUITS } from '../../data/recruits'
import { PixiBattle, type BattleView } from '../../render/battle/PixiBattle'
import { posKey, type Rotation } from '../../render/battle/iso'
import { useGame } from '../../state/store'
import { RotateIcon } from '../icons'
import { UnitInfo, AbilityInfo } from './BattleInfo'
import './battle-screen.css'

export function BattleScreen() {
  const hostRef = useRef<HTMLDivElement>(null)
  const pbRef = useRef<PixiBattle | null>(null)
  const [pbReady, setPbReady] = useState(false)

  const battle = useGame((s) => s.battle)
  const game = useGame((s) => s.game)
  const setBattleState = useGame((s) => s.setBattleState)
  const finishBattle = useGame((s) => s.finishBattle)
  const territoryName = useGame((s) =>
    battle ? s.game.territories[battle.territoryId]?.name ?? 'the frontier' : '',
  )

  const [selectedAbility, setSelectedAbility] = useState<string | null>(null)
  const [auto, setAuto] = useState(false)
  const [rotation, setRotation] = useState<Rotation>(0)
  const [inspectId, setInspectId] = useState<string | null>(null)

  // --- Pixi lifecycle (StrictMode-safe) ---
  useEffect(() => {
    const host = hostRef.current
    if (!host) return
    const pb = new PixiBattle()
    let disposed = false
    pb.init(host).then(() => {
      if (disposed) {
        pb.destroy()
        return
      }
      pbRef.current = pb
      setPbReady(true)
    })
    return () => {
      disposed = true
      if (pbRef.current === pb) pbRef.current = null
      pb.destroy()
      setPbReady(false)
    }
  }, [])

  const state = battle?.state ?? null
  const active = state?.activeUnitId ? state.units[state.activeUnitId] : null
  const isPlayerTurn = !!active && active.team === 'player' && state?.phase === 'in-progress'

  useEffect(() => {
    setSelectedAbility(null)
    setInspectId(null)
  }, [state?.activeUnitId])

  const reachable = useMemo(() => {
    if (!state || !isPlayerTurn || !active || active.hasMoved || selectedAbility) return new Set<string>()
    return new Set(reachableTiles(state, active).map(posKey))
  }, [state, active, isPlayerTurn, selectedAbility])

  const targets = useMemo(() => {
    if (!state || !isPlayerTurn || !active || !selectedAbility) return new Set<string>()
    return abilityTargetKeys(state, active, getAbility(selectedAbility))
  }, [state, active, isPlayerTurn, selectedAbility])

  const view = useMemo<BattleView>(() => {
    const unitAt = (pos: Position) =>
      Object.values(state?.units ?? {}).find((u) => u.pos.x === pos.x && u.pos.y === pos.y)

    const onTileClick = (pos: Position) => {
      if (!state) return
      // 1) Use a selected targeted ability on a valid target.
      if (isPlayerTurn && active && selectedAbility) {
        const def = getAbility(selectedAbility)
        if (def.targetType !== 'self') {
          const t = targetUnitAt(state, active, def, pos)
          if (t) {
            try {
              setBattleState(useAbility(state, active.id, selectedAbility, { unitId: t.id }))
              setSelectedAbility(null)
              setInspectId(null)
            } catch {
              /* ignore */
            }
            return
          }
        }
      }
      // 2) Move to a reachable empty tile.
      if (isPlayerTurn && active && !selectedAbility && !active.hasMoved && reachable.has(posKey(pos))) {
        setBattleState(moveUnit(state, active.id, pos))
        setInspectId(null)
        return
      }
      // 3) Otherwise inspect whatever unit is on the tile (monster or ally).
      const u = unitAt(pos)
      setInspectId(u ? u.id : null)
    }
    const biome = battle ? game.territories[battle.territoryId]?.type : undefined
    return { reachable, targets, activeId: active?.id ?? null, biome, rotation, onTileClick }
  }, [reachable, targets, active, isPlayerTurn, selectedAbility, state, setBattleState, battle, game, rotation])

  useEffect(() => {
    if (pbReady && pbRef.current && state) pbRef.current.render(state, view)
  }, [pbReady, state, view])

  // AI-driven turns run themselves, one at a time: always for the enemy, and
  // for the player's crew too while Auto is enabled.
  useEffect(() => {
    if (!state || state.phase !== 'in-progress') return
    const act = state.activeUnitId ? state.units[state.activeUnitId] : null
    if (!act) return
    const aiControlled = act.team === 'enemy' || auto
    if (!aiControlled) return
    const delay = auto ? 300 : 650
    const t = setTimeout(() => {
      const cur = useGame.getState().battle?.state
      if (cur && cur.activeUnitId === act.id && cur.phase === 'in-progress') {
        setBattleState(runEnemyTurn(cur, act.id))
      }
    }, delay)
    return () => clearTimeout(t)
  }, [state, setBattleState, auto])

  if (!battle || !state) return null

  // Tapping an ability selects it (and shows its info box). It is then either
  // used on a target (board tap) or confirmed via the info box for self-casts.
  const onAbility = (id: string) => {
    if (!isPlayerTurn || !active || active.hasActed) return
    const def = getAbility(id)
    if (active.stats.steam < def.steamCost) return
    setInspectId(null)
    setSelectedAbility((prev) => (prev === id ? null : id))
  }

  const useSelectedSelf = () => {
    if (!isPlayerTurn || !active || !selectedAbility) return
    const def = getAbility(selectedAbility)
    if (def.targetType !== 'self') return
    setBattleState(useAbility(state, active.id, selectedAbility, { unitId: active.id }))
    setSelectedAbility(null)
  }

  const onEndTurn = () => {
    if (!isPlayerTurn || !active) return
    setSelectedAbility(null)
    setInspectId(null)
    setBattleState(endTurn(state, active.id))
  }

  const forecast = forecastTurns(state, 6)
  const over = state.phase !== 'in-progress'

  return (
    <div className="screen stack battle battle--fullscreen">
      <div className="battle__topbar">
        <div className={`battle__phase battle__phase--${state.phase}`}>
          {state.phase === 'won' && 'Victory!'}
          {state.phase === 'lost' && 'Defeat'}
          {state.phase === 'in-progress' &&
            (isPlayerTurn ? `${active?.name}'s turn` : `${active?.name} (enemy)…`)}
        </div>
        <div className="battle__forecast">
          {forecast.map((id, i) => {
            const u = state.units[id]
            return (
              <span key={`${id}-${i}`} className={`pip pip--${u.team}${i === 0 ? ' pip--now' : ''}`} title={u.name}>
                {u.name[0]}
              </span>
            )
          })}
        </div>
      </div>

      <div className="muted battle__where">Battle for {territoryName}</div>

      <div className="battle__stage-wrap">
        <div className="battle__stage" ref={hostRef} />
        <div className="battle__rotate">
          <button
            className="btn btn--xs battle__rotate-btn"
            onClick={() => setRotation((r) => (((r + 3) % 4) as Rotation))}
            aria-label="Rotate view left"
            title="Rotate left"
          >
            <RotateIcon dir="left" size={16} />
          </button>
          <button
            className="btn btn--xs battle__rotate-btn"
            onClick={() => setRotation((r) => (((r + 1) % 4) as Rotation))}
            aria-label="Rotate view right"
            title="Rotate right"
          >
            <RotateIcon dir="right" size={16} />
          </button>
        </div>
        {inspectId && state.units[inspectId] && (
          <div className="battle__inspect">
            <UnitInfo unit={state.units[inspectId]} onClose={() => setInspectId(null)} />
          </div>
        )}
      </div>

      <div className="battle__feed">
        {state.log.slice(-5).map((e, i) => (
          <div key={state.log.length - 5 + i} className={`feed-line feed-line--${e.kind ?? 'info'}`}>
            {e.text}
          </div>
        ))}
      </div>

      {!over ? (
        <div className="panel battle__hud">
          {active && (
            <div className="battle__active">
              <span className={`dot dot--${active.team}`} />
              <strong>{active.name}</strong>
              <span className="muted">
                {active.stats.hp}/{active.stats.maxHp} HP · {active.stats.steam} steam
              </span>
              {active.reaction && (
                <span className="reaction-chip" title="Reaction">
                  ⟲ {getAbility(active.reaction).name}
                </span>
              )}
              <div className="battle__active-right">
                {isPlayerTurn && (
                  <span className="muted battle__flags">
                    {active.hasMoved ? 'moved' : 'can move'} · {active.hasActed ? 'acted' : 'can act'}
                  </span>
                )}
                <button
                  className={`btn btn--xs${auto ? ' is-selected' : ''}`}
                  onClick={() => {
                    setSelectedAbility(null)
                    setAuto((a) => !a)
                  }}
                  title="Let the AI play the whole battle"
                >
                  {auto ? '❚❚ Auto' : '▶ Auto'}
                </button>
              </div>
            </div>
          )}

          {isPlayerTurn && active && !auto ? (
            <>
              <div className="battle__abilities">
                {active.abilities
                  .filter((a) => a !== 'wait')
                  .map((id) => {
                    const def = getAbility(id)
                    const unaffordable = active.stats.steam < def.steamCost
                    return (
                      <button
                        key={id}
                        className={`btn btn--sm${selectedAbility === id ? ' is-selected' : ''}`}
                        onClick={() => onAbility(id)}
                        disabled={active.hasActed || unaffordable}
                        title={def.description}
                      >
                        {def.name}
                        {def.steamCost > 0 && <span className="cost"> {def.steamCost} steam</span>}
                      </button>
                    )
                  })}
              </div>
              {selectedAbility && (
                <AbilityInfo
                  def={getAbility(selectedAbility)}
                  onUse={getAbility(selectedAbility).targetType === 'self' ? useSelectedSelf : undefined}
                  onCancel={() => setSelectedAbility(null)}
                />
              )}
              <div className="battle__actions">
                {!selectedAbility && (
                  <span className="muted battle__hint">
                    {reachable.size > 0 ? 'Tap a glowing tile to move' : 'Tap an action, or a unit to inspect'}
                  </span>
                )}
                <button className="btn btn--sm" onClick={onEndTurn}>
                  End Turn ▸
                </button>
              </div>
            </>
          ) : (
            <div className="muted battle__hint">
              {auto ? 'Auto-playing… tap Auto to take control.' : 'The Rusthorde is moving…'}
            </div>
          )}
        </div>
      ) : (
        <div className="panel battle__hud battle__hud--over">
          <p className="muted">
            {state.phase === 'won'
              ? `You've taken ${territoryName}!`
              : `The crew retreats from ${territoryName}.`}
          </p>
          {state.phase === 'won' && (
            <ul className="battle__rewards">
              {awardBattleXp(game, state).rewards.map((r) => (
                <li key={r.charId}>
                  {r.name} <span className="muted">+{r.gained} XP · +{r.jpGained} JP</span>
                  {r.toLevel > r.fromLevel && (
                    <span className="battle__levelup"> → Lv {r.toLevel}!</span>
                  )}
                </li>
              ))}
              {(() => {
                const recruit = RECRUITS[battle.territoryId]
                return recruit && !game.roster[recruit.id] ? (
                  <li className="battle__levelup">{recruit.name} joins your crew!</li>
                ) : null
              })()}
            </ul>
          )}
          <button className="btn" onClick={finishBattle}>
            Return to Map ▸
          </button>
        </div>
      )}
    </div>
  )
}
