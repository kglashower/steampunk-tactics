import { useEffect, useRef, useState } from 'react'
import { MAX_PARTY, useGame } from '../../state/store'
import { RESOURCES } from '../../data/resources'
import { JOBS } from '../../data/jobs'
import { MONSTER_FAMILIES } from '../../data/units'
import { territoryAttackProbability } from '../../engine/world/attackProbability'
import { availableParty, garrisonLocation, isAttackable } from '../../engine/world/territory'
import type { Character, GameState, Territory, TerritoryType } from '../../types'
import './screens.css'

/** The single most relevant next-step hint for the core loop, or null. */
function nextObjective(game: GameState): string | null {
  const terrs = Object.values(game.territories)
  const ownedActive = terrs.filter((t) => t.owner === 'player' && !t.overrun)
  const totalRes = Object.values(game.resources).reduce((a, b) => a + b, 0)
  const anyBuilding = terrs.some((t) => t.buildings.length > 0)
  const overrun = terrs.find((t) => t.owner === 'player' && t.overrun)
  if (overrun) return `${overrun.name} was overrun — tap it and Recapture to restore it.`
  if (ownedActive.length <= 1) return 'New here? Tap a glowing territory, then Attack, to claim your first expansion.'
  if (totalRes === 0) return 'Tap End Day to gather resources from the territories you hold.'
  if (!anyBuilding) return 'Open Build to raise a Forge (on foundry land) or Workshop, then craft gear in the Workshop.'
  return null
}

const TYPE_COLOR: Record<TerritoryType, string> = {
  foundry: '#9aa3ab',
  cinder: '#d9772b',
  verdigris: '#3a8d80',
  quartz: '#9b8cd6',
}

/** A small blueprint glyph per biome, drawn centered in a node. */
function BiomeGlyph({ type }: { type: TerritoryType }) {
  const c = { stroke: '#EDE4D3', strokeWidth: 1, fill: 'none', strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const }
  switch (type) {
    case 'foundry':
      return (
        <g {...c}>
          <circle r="2.3" />
          <path d="M0 -3.6V-2.2M0 2.2V3.6M-3.6 0H-2.2M2.2 0H3.6" />
        </g>
      )
    case 'cinder':
      return <path {...c} d="M0 3.2 C-2.4 0.8 1 -0.4 0.2 -3.4 C2.6 -1 2.2 1.4 0 3.2 Z" />
    case 'verdigris':
      return <path {...c} d="M0 -3.4 C2.6 0.2 2.6 3.4 0 3.4 C-2.6 3.4 -2.6 0.2 0 -3.4 Z" />
    case 'quartz':
      return (
        <g {...c}>
          <path d="M0 -3.6 L2.6 0 L0 3.6 L-2.6 0 Z" />
          <path d="M0 -3.6V3.6" />
        </g>
      )
  }
}

export function MapScreen() {
  const game = useGame((s) => s.game)
  const endTurn = useGame((s) => s.endTurn)
  const startAttack = useGame((s) => s.startAttack)
  const assignGarrison = useGame((s) => s.assignGarrison)
  const unassignGarrison = useGame((s) => s.unassignGarrison)
  const summary = useGame((s) => s.lastSummary)

  const [hintsHidden, setHintsHidden] = useState(() => localStorage.getItem('st_hideHints') === '1')
  const objective = hintsHidden ? null : nextObjective(game)
  const dismissHints = () => {
    localStorage.setItem('st_hideHints', '1')
    setHintsHidden(true)
  }

  const [selectedId, setSelectedId] = useState<string>('ironhold')
  const detailRef = useRef<HTMLDivElement>(null)
  const userSelected = useRef(false)
  useEffect(() => {
    // Bring the detail panel into view after the player taps a node (not on first render).
    if (userSelected.current) detailRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }, [selectedId])
  const [showGarrison, setShowGarrison] = useState(false)
  const [pickerOpen, setPickerOpen] = useState(false)

  const territories = Object.values(game.territories)
  const selected = game.territories[selectedId] ?? null
  const party = availableParty(game)
  const name = (id: string) => game.territories[id]?.name ?? id

  // Deduplicated edges.
  const edges: [Territory, Territory][] = []
  for (const t of territories) {
    for (const adj of t.adjacency) {
      const n = game.territories[adj]
      if (n && t.id < n.id) edges.push([t, n])
    }
  }

  // Fit the viewBox to the (large) map bounds; the container scrolls.
  const xs = territories.map((t) => t.coord.x)
  const ys = territories.map((t) => t.coord.y)
  const PAD = 9
  const minX = Math.min(...xs) - PAD
  const minY = Math.min(...ys) - PAD
  const vbW = Math.max(...xs) - Math.min(...xs) + PAD * 2
  const vbH = Math.max(...ys) - Math.min(...ys) + PAD * 2

  return (
    <div className="screen stack">
      <div className="screen__head">
        <h2>The Region</h2>
        <p className="muted">
          Tap a territory to act. {party.length} crew ready to deploy.
        </p>
      </div>

      {objective && (
        <div className="objective">
          <span className="objective__icon" aria-hidden>◈</span>
          <span className="objective__text">{objective}</span>
          <button className="objective__close" onClick={dismissHints} aria-label="Dismiss tips">×</button>
        </div>
      )}

      {summary && (
        <div className="panel day-report">
          <strong>Day report</strong>
          <div className="muted day-report__line">
            {Object.entries(summary.produced).length > 0
              ? 'Produced ' +
                Object.entries(summary.produced)
                  .map(([r, n]) => `+${n} ${RESOURCES[r as keyof typeof RESOURCES].name}`)
                  .join(', ')
              : 'No resources produced.'}
          </div>
          <div className="muted day-report__line">
            {summary.incursions.length === 0
              ? 'The frontier was quiet.'
              : summary.incursions
                  .map((i) =>
                    i.defended
                      ? `${name(i.territoryId)}: garrison ${i.held ? 'held' : 'fell — overrun!'}`
                      : `${name(i.territoryId)}: overrun!`,
                  )
                  .join(' · ')}
          </div>
        </div>
      )}

      <div className="map-graph-wrap map-graph-wrap--scroll">
        <svg
          viewBox={`${minX} ${minY} ${vbW} ${vbH}`}
          className="map-graph"
          style={{ aspectRatio: `${vbW} / ${vbH}` }}
          role="img"
          aria-label="Territory map"
        >
          {edges.map(([a, b]) => (
            <line
              key={`${a.id}-${b.id}`}
              x1={a.coord.x} y1={a.coord.y} x2={b.coord.x} y2={b.coord.y}
              className="map-edge"
            />
          ))}
          {territories.map((t) => {
            const owned = t.owner === 'player'
            const attackable = isAttackable(game, t.id)
            const stateClass = t.overrun ? 'overrun' : owned ? 'owned' : 'wild'
            return (
              <g
                key={t.id}
                className={`map-node map-node--${stateClass}${attackable ? ' map-node--attackable' : ''}${selectedId === t.id ? ' map-node--selected' : ''}`}
                onClick={() => { userSelected.current = true; setSelectedId(t.id); setShowGarrison(false); setPickerOpen(false) }}
                transform={`translate(${t.coord.x} ${t.coord.y})`}
              >
                <circle r="6.5" style={{ stroke: TYPE_COLOR[t.type] }} />
                <BiomeGlyph type={t.type} />
                {/* Difficulty tier badge (bottom-left). */}
                <text className="map-node__tier" x="-6" y="8.5">T{t.tier}</text>
                {/* Attackable marker (top-right). */}
                {attackable && <text className="map-node__attack" x="5" y="-4.5">⚔</text>}
                {owned && t.garrison.length > 0 && (
                  <text className="map-node__garrison" x="5.5" y="8.5">◆{t.garrison.length}</text>
                )}
                {/* Tap-to-peek: show the name of the selected node right on the map. */}
                {selectedId === t.id && (
                  <text className="map-node__label" x="0" y="12">{t.name}</text>
                )}
              </g>
            )
          })}
        </svg>
      </div>

      {selected && (
        <div ref={detailRef} className={`panel stack territory-detail territory-detail--${selected.overrun ? 'overrun' : selected.owner}`}>
          <div className="territory-card__row">
            <div className="territory-card__main">
              <div className="territory-card__name">
                {selected.name}
                {selected.overrun && <span className="tag tag--danger">Overrun</span>}
                {selected.owner === 'wild' && <span className="tag tag--wild">Wild</span>}
              </div>
              <div className="muted territory-card__meta">
                {RESOURCES[selected.resource].name} {RESOURCES[selected.resource].glyph} · {MONSTER_FAMILIES[selected.type].name} · tier {selected.tier}
              </div>
            </div>
            {selected.owner === 'player' && !selected.overrun && (
              <div className="territory-card__threat">
                <span className="muted">Attack risk</span>
                <strong className={territoryAttackProbability(game, selected) === 0 ? 'safe' : 'threat'}>
                  {Math.round(territoryAttackProbability(game, selected) * 100)}%
                </strong>
              </div>
            )}
          </div>

          <div className="territory-card__actions">
            {isAttackable(game, selected.id) && (
              <button
                className="btn btn--sm"
                onClick={() => setPickerOpen(true)}
                disabled={party.length === 0}
                title={party.length === 0 ? 'All crew are on garrison duty' : undefined}
              >
                {selected.overrun ? 'Recapture ⚔' : 'Attack ⚔'}
              </button>
            )}
            {selected.owner === 'player' && (
              <button className="btn btn--ghost btn--sm" onClick={() => setShowGarrison((v) => !v)}>
                Garrison ({selected.garrison.length})
              </button>
            )}
            {selected.owner === 'wild' && !selected.overrun && !isAttackable(game, selected.id) && (
              <p className="muted territory-card__locked">
                Claim a bordering territory first — you can only march on lands next to your own.
              </p>
            )}
          </div>

          {selected.owner === 'player' && showGarrison && (
            <div className="garrison-editor">
              {Object.values(game.roster).map((c) => {
                const loc = garrisonLocation(game, c.id)
                const here = loc === selected.id
                return (
                  <div className="garrison-row" key={c.id}>
                    <span className="garrison-row__name">
                      {c.name} <span className="muted">· {JOBS[c.job].name}</span>
                    </span>
                    {here ? (
                      <button className="btn btn--ghost btn--xs" onClick={() => unassignGarrison(c.id)}>Recall</button>
                    ) : (
                      <button className="btn btn--xs" onClick={() => assignGarrison(selected.id, c.id)}>
                        {loc ? `Move (at ${name(loc)})` : 'Station'}
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      <div className="panel stack">
        <p className="muted">
          End the day to gather resources. Exposed territories may be raided — station crew to defend them.
        </p>
        <button className="btn" onClick={endTurn}>End Day ▸</button>
      </div>

      {pickerOpen && selected && (
        <PartyPicker
          available={party}
          onCancel={() => setPickerOpen(false)}
          onLaunch={(ids) => {
            setPickerOpen(false)
            startAttack(selected.id, ids)
          }}
        />
      )}
    </div>
  )
}

function PartyPicker({
  available,
  onLaunch,
  onCancel,
}: {
  available: Character[]
  onLaunch: (ids: string[]) => void
  onCancel: () => void
}) {
  const [chosen, setChosen] = useState<string[]>(() => available.slice(0, MAX_PARTY).map((c) => c.id))

  const toggle = (id: string) => {
    setChosen((cur) => {
      if (cur.includes(id)) return cur.filter((x) => x !== id)
      if (cur.length >= MAX_PARTY) return cur
      return [...cur, id]
    })
  }

  return (
    <div className="modal-backdrop" onClick={onCancel}>
      <div className="modal panel stack" onClick={(e) => e.stopPropagation()}>
        <strong>Choose your party</strong>
        <p className="muted" style={{ fontSize: '0.82rem', margin: 0 }}>
          Up to {MAX_PARTY} crew. ({chosen.length} selected)
        </p>
        <div className="party-list">
          {available.map((c) => {
            const on = chosen.includes(c.id)
            return (
              <button
                key={c.id}
                className={`party-member${on ? ' party-member--on' : ''}`}
                onClick={() => toggle(c.id)}
              >
                <span className="party-member__name">{c.name}</span>
                <span className="muted">{JOBS[c.job].name} · Lv {c.level}</span>
              </button>
            )
          })}
        </div>
        <div className="modal__actions">
          <button className="btn btn--ghost btn--sm" onClick={onCancel}>Cancel</button>
          <button className="btn btn--sm" disabled={chosen.length === 0} onClick={() => onLaunch(chosen)}>
            Deploy ⚔
          </button>
        </div>
      </div>
    </div>
  )
}
