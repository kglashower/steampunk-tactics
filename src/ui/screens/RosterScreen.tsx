import { useState } from 'react'
import { useGame } from '../../state/store'
import { JOBS, JOB_ORDER } from '../../data/jobs'
import { ITEMS, ITEM_ORDER } from '../../data/items'
import { ABILITIES } from '../../engine/battle/abilities'
import { canEquip, characterStats } from '../../engine/economy/equipment'
import {
  canUnlockJob,
  jobUnlockBlocker,
  jobVisible,
  learnBlocker,
  learnset,
  learnedForSlot,
} from '../../engine/progression/jobs'
import { MAX_LEVEL, xpToNext } from '../../engine/progression/leveling'
import type { AbilitySlot, Character, EquipSlot, JobId } from '../../types'
import { JobIcon } from '../icons'
import './screens.css'

type Tab = 'jobs' | 'loadout' | 'gear'

export function RosterScreen() {
  const roster = useGame((s) => s.game.roster)
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const selected = selectedId ? roster[selectedId] : null
  if (selected) {
    return <CharDetail char={selected} onBack={() => setSelectedId(null)} />
  }

  return (
    <div className="screen stack">
      <div className="screen__head">
        <h2>Your Crew</h2>
        <p className="muted">
          Win battles to earn XP (levels) and JP. Spend JP to unlock jobs and learn abilities,
          then slot them into a five-slot loadout. Tap a crew member to manage them.
        </p>
      </div>
      <ul className="roster-list">
        {Object.values(roster).map((c) => (
          <CrewRow key={c.id} char={c} onOpen={() => setSelectedId(c.id)} />
        ))}
      </ul>
    </div>
  )
}

/** Compact tappable summary of one crew member in the roster list. */
function CrewRow({ char, onOpen }: { char: Character; onOpen: () => void }) {
  const job = JOBS[char.job]
  const unspent = char.jp > 0
  return (
    <li>
      <button className="crew-row" onClick={onOpen}>
        <span className="char-card__avatar" aria-hidden>{char.name[0]}</span>
        <span className="crew-row__info">
          <span className="crew-row__name">{char.name} <span className="muted">· Lv {char.level}</span></span>
          <span className="crew-row__job"><JobIcon job={char.job} size={13} /> {job.name} <span className="muted">· {job.role}</span></span>
        </span>
        {unspent && <span className="crew-row__jp" title="Unspent Job Points">{char.jp} JP</span>}
        <span className="crew-row__chevron" aria-hidden>›</span>
      </button>
    </li>
  )
}

/** Full management view for a single crew member. */
function CharDetail({ char, onBack }: { char: Character; onBack: () => void }) {
  const [tab, setTab] = useState<Tab>('jobs')
  const stats = characterStats(char)
  const job = JOBS[char.job]

  return (
    <div className="screen stack">
      <button className="btn btn--ghost btn--sm back-btn" onClick={onBack}>‹ Crew</button>

      <div className="panel char-card char-card--col">
        <div className="char-card__top">
          <div className="char-card__avatar char-card__avatar--lg" aria-hidden>{char.name[0]}</div>
          <div className="char-card__info">
            <div className="char-card__name">{char.name} <span className="muted">· Lv {char.level}</span></div>
            <div className="char-card__job"><JobIcon job={char.job} size={14} /> {job.name} <span className="muted">· {job.role}</span></div>
            <div className="xp-bar" title={char.level >= MAX_LEVEL ? 'Max level' : `${char.xp} / ${xpToNext(char.level)} XP`}>
              <div className="xp-bar__fill" style={{ width: char.level >= MAX_LEVEL ? '100%' : `${Math.min(100, (char.xp / xpToNext(char.level)) * 100)}%` }} />
            </div>
          </div>
          <div className="char-card__stats muted">
            {stats.maxHp} HP · {stats.attack} Atk · {stats.defense} Def · {stats.tech} Tech
            <div className="char-card__jp">{char.jp} JP</div>
          </div>
        </div>

        <div className="char-card__tabs">
          {(['jobs', 'loadout', 'gear'] as Tab[]).map((t) => (
            <button key={t} className={`btn btn--ghost btn--sm${tab === t ? ' is-selected' : ''}`} onClick={() => setTab(t)}>
              {t === 'jobs' ? 'Jobs' : t === 'loadout' ? 'Loadout' : 'Gear'}
            </button>
          ))}
        </div>

        {tab === 'jobs' && <JobsPanel char={char} />}
        {tab === 'loadout' && <LoadoutPanel char={char} />}
        {tab === 'gear' && <GearPanel char={char} />}
      </div>
    </div>
  )
}

function JobsPanel({ char }: { char: Character }) {
  const unlockJobFor = useGame((s) => s.unlockJobFor)
  const switchJobFor = useGame((s) => s.switchJobFor)
  const learnAbilityFor = useGame((s) => s.learnAbilityFor)
  // Unlocking a job is an expensive, irreversible JP spend, so require a
  // second confirming tap before committing.
  const [confirm, setConfirm] = useState<JobId | null>(null)

  const jobs = JOB_ORDER.filter((j) => jobVisible(char, j))
  const learnables = learnset(char)

  return (
    <div className="tree-list">
      <div className="muted subhead">Jobs</div>
      {jobs.map((j) => {
        const def = JOBS[j]
        const unlocked = char.unlockedJobs.includes(j)
        const current = char.job === j
        const blocker = jobUnlockBlocker(char, j)
        return (
          <div className={`tree-node${current ? ' tree-node--known' : ''}`} key={j}>
            <div className="tree-node__info">
              <span className="tree-node__name"><JobIcon job={j} size={13} /> {def.name} <span className="muted">· T{def.tier}</span></span>
              <span className="muted tree-node__desc">{def.blurb}</span>
            </div>
            <div className="tree-node__action">
              {current ? (
                <span className="tree-node__known">Active</span>
              ) : unlocked ? (
                <button className="btn btn--xs" onClick={() => switchJobFor(char.id, j)}>Switch</button>
              ) : confirm === j ? (
                <>
                  <button className="btn btn--xs" onClick={() => { unlockJobFor(char.id, j); setConfirm(null) }}>
                    Confirm {def.jpCost} JP
                  </button>
                  <button className="btn btn--ghost btn--xs" onClick={() => setConfirm(null)}>Cancel</button>
                </>
              ) : (
                <>
                  <button className="btn btn--xs" disabled={!canUnlockJob(char, j)} onClick={() => setConfirm(j)}>
                    {def.jpCost} JP
                  </button>
                  {blocker && !blocker.includes('JP') && <span className="muted tree-node__blocker">{blocker}</span>}
                </>
              )}
            </div>
          </div>
        )
      })}

      <div className="muted subhead">Learn abilities</div>
      {learnables.map((n) => {
        const def = ABILITIES[n.ability]
        const known = char.unlocked.includes(n.ability)
        const blocker = learnBlocker(char, n.ability)
        return (
          <div className={`tree-node${known ? ' tree-node--known' : ''}`} key={n.ability}>
            <div className="tree-node__info">
              <span className="tree-node__name">{def?.name ?? n.ability} <span className="slot-tag">{def ? slotLabel(def.slot) : ''}</span></span>
              <span className="muted tree-node__desc">{def?.description}</span>
            </div>
            {known ? (
              <span className="tree-node__known">✓</span>
            ) : (
              <button className="btn btn--xs" disabled={blocker !== null} onClick={() => learnAbilityFor(char.id, n.ability)}>
                {n.cost} JP
              </button>
            )}
          </div>
        )
      })}
    </div>
  )
}

const SLOT_DEFS: { key: string; label: string; cat: AbilitySlot }[] = [
  { key: 'action0', label: 'Action 1', cat: 'action' },
  { key: 'action1', label: 'Action 2', cat: 'action' },
  { key: 'reaction', label: 'Reaction', cat: 'reaction' },
  { key: 'passive', label: 'Passive', cat: 'passive' },
  { key: 'movement', label: 'Movement', cat: 'movement' },
]

function LoadoutPanel({ char }: { char: Character }) {
  const setLoadoutSlot = useGame((s) => s.setLoadoutSlot)
  const [open, setOpen] = useState<string | null>(null)

  const current = (key: string): string | null => {
    if (key === 'action0') return char.loadout.actions[0]
    if (key === 'action1') return char.loadout.actions[1]
    if (key === 'reaction') return char.loadout.reaction
    if (key === 'passive') return char.loadout.passive
    return char.loadout.movement
  }

  return (
    <div className="loadout">
      {SLOT_DEFS.map(({ key, label, cat }) => {
        const cur = current(key)
        const options = learnedForSlot(char, cat)
        const isOpen = open === key
        return (
          <div key={key} className="loadout__slot">
            <button className={`slot${cur ? ' slot--filled' : ''}${isOpen ? ' slot--open' : ''}`} onClick={() => setOpen(isOpen ? null : key)}>
              <span className="slot__label">{label}</span>
              <span className="slot__value">{cur ? ABILITIES[cur]?.name ?? cur : '—'}</span>
            </button>
            {isOpen && (
              <div className="slot-picker">
                {cur && (
                  <div className="slot-picker__row">
                    <span>{ABILITIES[cur]?.name} <span className="muted">(equipped)</span></span>
                    <button className="btn btn--ghost btn--xs" onClick={() => setLoadoutSlot(char.id, key, null)}>Clear</button>
                  </div>
                )}
                {options.filter((o) => o !== cur).length === 0 && !cur && (
                  <div className="muted slot-picker__empty">No {cat} abilities learned yet.</div>
                )}
                {options.filter((o) => o !== cur).map((o) => (
                  <div className="slot-picker__row" key={o}>
                    <span>{ABILITIES[o]?.name} <span className="muted">· {ABILITIES[o]?.description}</span></span>
                    <button className="btn btn--xs" onClick={() => { setLoadoutSlot(char.id, key, o); setOpen(null) }}>Slot</button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

const GEAR_SLOTS: { slot: EquipSlot; label: string }[] = [
  { slot: 'weapon', label: 'Weapon' },
  { slot: 'armor', label: 'Armor' },
  { slot: 'accessory', label: 'Accessory' },
]

function GearPanel({ char }: { char: Character }) {
  const game = useGame((s) => s.game)
  const equipItem = useGame((s) => s.equipItem)
  const unequipItem = useGame((s) => s.unequipItem)
  const [open, setOpen] = useState<EquipSlot | null>(null)

  return (
    <>
      <div className="slot-row">
        {GEAR_SLOTS.map(({ slot, label }) => {
          const equipped = char.equipment[slot]
          const isOpen = open === slot
          const candidates = ITEM_ORDER.filter((id) => ITEMS[id].slot === slot && (game.inventory[id] ?? 0) > 0 && canEquip(char, id))
          return (
            <button key={slot} className={`slot${equipped ? ' slot--filled' : ''}${isOpen ? ' slot--open' : ''}`} onClick={() => setOpen(isOpen ? null : slot)}>
              <span className="slot__label">{label}</span>
              <span className="slot__value">{equipped ? ITEMS[equipped].name : '—'}</span>
              {candidates.length > 0 && !equipped && <span className="slot__dot" />}
            </button>
          )
        })}
      </div>
      {open && (() => {
        const equipped = char.equipment[open]
        const candidates = ITEM_ORDER.filter((id) => ITEMS[id].slot === open && (game.inventory[id] ?? 0) > 0 && canEquip(char, id))
        return (
          <div className="slot-picker">
            {equipped && (
              <div className="slot-picker__row">
                <span>{ITEMS[equipped].name} <span className="muted">(equipped)</span></span>
                <button className="btn btn--ghost btn--xs" onClick={() => unequipItem(char.id, open)}>Recall</button>
              </div>
            )}
            {candidates.length === 0 && !equipped && <div className="muted slot-picker__empty">Nothing craftable fits this slot yet.</div>}
            {candidates.map((id) => (
              <div className="slot-picker__row" key={id}>
                <span>{ITEMS[id].name} <span className="muted">×{game.inventory[id]}</span></span>
                <button className="btn btn--xs" onClick={() => equipItem(char.id, id)}>Equip</button>
              </div>
            ))}
          </div>
        )
      })()}
    </>
  )
}

function slotLabel(slot: AbilitySlot | undefined): string {
  switch (slot ?? 'action') {
    case 'reaction': return 'Reaction'
    case 'passive': return 'Passive'
    case 'movement': return 'Movement'
    default: return 'Action'
  }
}
