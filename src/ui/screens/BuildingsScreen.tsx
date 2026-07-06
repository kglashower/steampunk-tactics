import { useGame } from '../../state/store'
import { BUILDINGS, BUILDING_ORDER, type ResourceCost } from '../../data/buildings'
import { canAfford } from '../../engine/economy/buildings'
import type { BuildingType, ResourceType } from '../../types'
import { BuildingIcon, ResourceIcon } from '../icons'
import './screens.css'

function CostList({ cost }: { cost: ResourceCost }) {
  return (
    <span className="cost-list">
      {Object.entries(cost).map(([r, n]) => (
        <span key={r} className="cost-chip">
          {n} <ResourceIcon type={r as ResourceType} size={11} />
        </span>
      ))}
    </span>
  )
}

export function BuildingsScreen() {
  const game = useGame((s) => s.game)
  const buildBuilding = useGame((s) => s.buildBuilding)
  const upgradeBuilding = useGame((s) => s.upgradeBuilding)

  const owned = Object.values(game.territories).filter((t) => t.owner === 'player')

  return (
    <div className="screen stack">
      <div className="screen__head">
        <h2>Construction</h2>
        <p className="muted">
          Each building rises only on the right kind of land. Buildings unlock crafting and
          go inactive while a territory is overrun.
        </p>
      </div>

      {owned.map((t) => {
        const allowed = BUILDING_ORDER.filter((b) => BUILDINGS[b].allowed === t.type)
        return (
          <div className="panel stack" key={t.id}>
            <div className="build-territory__head">
              <strong>{t.name}</strong>
              {t.overrun && <span className="tag tag--danger">Overrun</span>}
            </div>

            {allowed.length === 0 && (
              <p className="muted build-none">No buildings can be raised on this terrain.</p>
            )}

            {allowed.map((type) => {
              const def = BUILDINGS[type]
              const inst = t.buildings.find((b) => b.type === type)
              if (!inst) {
                const cost = def.levelCost[0]
                return (
                  <div className="build-row" key={type}>
                    <div className="build-row__info">
                      <span className="build-row__name">
                        <BuildingIcon type={type} size={16} /> {def.name}
                      </span>
                      <span className="muted build-row__desc">{def.unlocks}</span>
                      <CostList cost={cost} />
                    </div>
                    <button
                      className="btn btn--sm"
                      disabled={t.overrun || !canAfford(game, cost)}
                      onClick={() => buildBuilding(t.id, type)}
                    >
                      Build
                    </button>
                  </div>
                )
              }
              const maxed = inst.level >= def.maxLevel
              const upCost = maxed ? null : def.levelCost[inst.level]
              return (
                <div className="build-row" key={type}>
                  <div className="build-row__info">
                    <span className="build-row__name">
                      <BuildingIcon type={type} size={16} /> {def.name} <span className="muted">· Lv {inst.level}</span>
                    </span>
                    {upCost && <CostList cost={upCost} />}
                  </div>
                  {maxed ? (
                    <span className="muted build-row__max">Max level</span>
                  ) : (
                    <button
                      className="btn btn--sm"
                      disabled={t.overrun || !upCost || !canAfford(game, upCost)}
                      onClick={() => upgradeBuilding(t.id, type)}
                    >
                      Upgrade
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        )
      })}
    </div>
  )
}
