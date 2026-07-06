import { lazy, Suspense, useState, type ComponentType } from 'react'
import { useGame } from '../state/store'
import { RESOURCE_ORDER } from '../data/resources'
import type { ScreenId } from '../types'
import { MapScreen } from './screens/MapScreen'
import { RosterScreen } from './screens/RosterScreen'
import { CraftingScreen } from './screens/CraftingScreen'
import { BuildingsScreen } from './screens/BuildingsScreen'
import { GearMark, NavIcon, ResourceIcon } from './icons'
import { ResourceLegend, SettingsModal } from './HeaderMenus'
import { Toast } from './Toast'
import './app-shell.css'

// Battle pulls in PixiJS, so load it on demand to keep the initial bundle light.
const BattleScreen = lazy(() =>
  import('./screens/BattleScreen').then((m) => ({ default: m.BattleScreen })),
)

const NAV: { id: ScreenId; label: string; glyph: string }[] = [
  { id: 'map', label: 'Map', glyph: '🗺' },
  { id: 'roster', label: 'Crew', glyph: '👤' },
  { id: 'crafting', label: 'Workshop', glyph: '⚒' },
  { id: 'buildings', label: 'Build', glyph: '🏭' },
]

const SCREENS: Record<ScreenId, ComponentType> = {
  map: MapScreen,
  roster: RosterScreen,
  crafting: CraftingScreen,
  buildings: BuildingsScreen,
}

export function AppShell() {
  const screen = useGame((s) => s.screen)
  const setScreen = useGame((s) => s.setScreen)
  const turn = useGame((s) => s.game.turn)
  const resources = useGame((s) => s.game.resources)
  const inBattle = useGame((s) => s.battle !== null)
  const [menu, setMenu] = useState<'none' | 'settings' | 'legend'>('none')

  // A battle takes over the whole screen until it's resolved.
  if (inBattle) {
    return (
      <Suspense fallback={<div className="boot"><p className="muted">Deploying…</p></div>}>
        <BattleScreen />
      </Suspense>
    )
  }

  const Screen = SCREENS[screen]

  return (
    <div className="shell">
      <header className="shell__header">
        <button className="shell__title shell__title--btn" onClick={() => setMenu('settings')} aria-label="Settings">
          <span className="shell__crest" aria-hidden>
            <GearMark size={26} />
          </span>
          <div>
            <h1>Day {turn}</h1>
            <span className="muted shell__turn">Steampunk Tactics</span>
          </div>
        </button>
        <button className="shell__resources shell__resources--btn" onClick={() => setMenu('legend')} aria-label="Resource legend">
          {RESOURCE_ORDER.map((r) => (
            <span className="resource" key={r}>
              <span className="resource__glyph"><ResourceIcon type={r} size={16} /></span>
              <span className="resource__amount">{resources[r]}</span>
            </span>
          ))}
        </button>
      </header>

      {menu === 'settings' && <SettingsModal onClose={() => setMenu('none')} />}
      {menu === 'legend' && <ResourceLegend resources={resources} onClose={() => setMenu('none')} />}

      <main className="shell__main">
        <Suspense fallback={<div className="muted" style={{ padding: 'var(--space-4)' }}>Loading…</div>}>
          <Screen />
        </Suspense>
      </main>

      <nav className="shell__nav">
        {NAV.map((item) => (
          <button
            key={item.id}
            className={`navbtn${screen === item.id ? ' navbtn--active' : ''}`}
            onClick={() => setScreen(item.id)}
          >
            <span className="navbtn__glyph" aria-hidden>
              <NavIcon id={item.id} size={22} />
            </span>
            <span className="navbtn__label">{item.label}</span>
          </button>
        ))}
      </nav>

      <Toast />
    </div>
  )
}
