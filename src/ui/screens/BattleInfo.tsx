import { ABILITIES, type AbilityDef } from '../../engine/battle/abilities'
import type { BattleUnit } from '../../engine/battle/types'

function abilityMeta(def: AbilityDef): string {
  const parts: string[] = [def.steamCost > 0 ? `${def.steamCost} steam` : 'free']
  parts.push(def.targetType === 'self' ? 'self' : `range ${def.range}`)
  if (def.area) parts.push(`AoE ${def.area}`)
  return parts.join(' · ')
}

/** Info box for the ability the player is about to use. */
export function AbilityInfo({
  def,
  onUse,
  onCancel,
}: {
  def: AbilityDef
  /** Provided for self-cast abilities (a confirm button); omitted for targeted ones. */
  onUse?: () => void
  onCancel: () => void
}) {
  return (
    <div className="info-box">
      <div className="info-box__head">
        <strong>{def.name}</strong>
        <span className="muted">{abilityMeta(def)}</span>
      </div>
      <p className="info-box__desc muted">{def.description}</p>
      <div className="info-box__actions">
        {onUse ? (
          <button className="btn btn--sm" onClick={onUse}>
            Use
          </button>
        ) : (
          <span className="muted info-box__hint">Tap a highlighted target</span>
        )}
        <button className="btn btn--ghost btn--sm" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </div>
  )
}

/** Inspect box for a tapped unit (monster or ally). */
export function UnitInfo({ unit, onClose }: { unit: BattleUnit; onClose: () => void }) {
  const s = unit.stats
  const abilities = unit.abilities.filter((a) => a !== 'wait')
  return (
    <div className="info-box info-box--unit">
      <div className="info-box__head">
        <span className={`dot dot--${unit.team}`} />
        <strong>{unit.name}</strong>
        <span className="muted">{unit.status === 'ko' ? 'downed' : `${s.hp}/${s.maxHp} HP`}</span>
        <button className="info-box__close" onClick={onClose} aria-label="Close">
          ×
        </button>
      </div>
      <div className="muted info-box__stats">
        Atk {s.attack} · Def {s.defense} · Tech {s.tech} · Spd {s.speed} · Move {s.move} · Jump {s.jump}
        {s.hover ? ' · Hover' : ''}
      </div>
      {unit.reaction && (
        <div className="muted info-box__stats">Reaction: {ABILITIES[unit.reaction]?.name ?? unit.reaction}</div>
      )}
      {abilities.length > 0 && (
        <div className="info-box__abils">
          {abilities.map((a) => (
            <span key={a} className="known-chip">
              {ABILITIES[a]?.name ?? a}
            </span>
          ))}
        </div>
      )}
      {unit.buffs.length > 0 && (
        <div className="muted info-box__buffs">
          Effects: {unit.buffs.map((b) => ABILITIES[b.id]?.name ?? b.id).join(', ')}
        </div>
      )}
    </div>
  )
}
