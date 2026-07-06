import { useGame } from '../../state/store'
import { BUILDINGS } from '../../data/buildings'
import { ITEMS, ITEM_ORDER } from '../../data/items'
import { JOBS } from '../../data/jobs'
import type { ItemMods } from '../../data/items'
import { ABILITIES } from '../../engine/battle/abilities'
import { activeBuildingLevel } from '../../engine/economy/buildings'
import { craftBlocker, ownedCount } from '../../engine/economy/crafting'
import type { BuildingType, ResourceType, TerritoryType } from '../../types'
import { BuildingIcon, ResourceIcon } from '../icons'
import './screens.css'

const BIOME_LABEL: Record<TerritoryType, string> = {
  foundry: 'foundry',
  cinder: 'cinder',
  verdigris: 'verdigris',
  quartz: 'quartz',
}

function modsText(mods: ItemMods): string {
  const parts: string[] = []
  if (mods.attack) parts.push(`+${mods.attack} Atk`)
  if (mods.defense) parts.push(`+${mods.defense} Def`)
  if (mods.maxHp) parts.push(`+${mods.maxHp} HP`)
  if (mods.maxSteam) parts.push(`+${mods.maxSteam} Steam`)
  if (mods.tech) parts.push(`+${mods.tech} Tech`)
  return parts.join(', ')
}

function effectText(id: string): string {
  const d = ITEMS[id]
  const parts: string[] = []
  if (d.steamRegen) parts.push(`+${d.steamRegen} Steam/turn`)
  if (d.startCt) parts.push(`+${d.startCt} starting CT`)
  if (d.grantsAbility) parts.push(`grants ${ABILITIES[d.grantsAbility]?.name ?? d.grantsAbility}`)
  return parts.join(', ')
}

export function CraftingScreen() {
  const game = useGame((s) => s.game)
  const craftItem = useGame((s) => s.craftItem)

  // Job-locked gear is only visible once some crew member has unlocked that job.
  const unlockedJobs = new Set(Object.values(game.roster).flatMap((c) => c.unlockedJobs))
  const visible = (id: string) => {
    const job = ITEMS[id].job
    return !job || unlockedJobs.has(job)
  }

  const groups: { building: BuildingType; label: string }[] = [
    { building: 'forge', label: 'Forge — Weapons' },
    { building: 'workshop', label: 'Workshop — Armor & Accessories' },
    { building: 'gunsmith', label: 'Gunsmith — Tier-3 Weapons' },
  ]

  return (
    <div className="screen stack">
      <div className="screen__head">
        <h2>Workshop</h2>
        <p className="muted">
          Spend resources to forge gear. Tier-2 items upgrade a tier-1 piece and need a
          higher-level building. Equip what you craft from the Crew screen.
        </p>
      </div>

      {groups.map((group) => (
        <div className="panel stack" key={group.building}>
          <div className="build-territory__head">
            <strong className="group-head">
              <BuildingIcon type={group.building} size={18} /> {group.label}
            </strong>
          </div>
          {activeBuildingLevel(game, group.building) === 0 && (
            <p className="muted build-hint">
              Raise a {BUILDINGS[group.building].name} on {BIOME_LABEL[BUILDINGS[group.building].allowed]} land (Build tab) to craft these.
            </p>
          )}
          {ITEM_ORDER.filter((id) => ITEMS[id].building === group.building && visible(id)).map((id) => {
            const def = ITEMS[id]
            const blocker = craftBlocker(game, id)
            const have = ownedCount(game, id)
            return (
              <div className="build-row" key={id}>
                <div className="build-row__info">
                  <span className="build-row__name">
                    {def.name}
                    <span className="tier-badge">T{def.tier}</span>
                    {def.job && <span className="job-badge">{JOBS[def.job].name} only</span>}
                    {have > 0 && <span className="muted"> · have {have}</span>}
                  </span>
                  <span className="muted build-row__desc">
                    {modsText(def.mods)}
                    {effectText(id) && ` · ${effectText(id)}`}
                  </span>
                  <span className="cost-list">
                    {Object.entries(def.recipe.resources).map(([r, n]) => (
                      <span key={r} className="cost-chip">
                        {n} <ResourceIcon type={r as ResourceType} size={11} />
                      </span>
                    ))}
                    {def.recipe.upgradeFrom && (
                      <span className="cost-chip cost-chip--item">1 {ITEMS[def.recipe.upgradeFrom].name}</span>
                    )}
                  </span>
                </div>
                <div className="build-row__action">
                  <button className="btn btn--sm" disabled={blocker !== null} onClick={() => craftItem(id)}>
                    Craft
                  </button>
                  {blocker && <span className="muted build-row__blocker">{blocker}</span>}
                </div>
              </div>
            )
          })}
        </div>
      ))}
    </div>
  )
}
