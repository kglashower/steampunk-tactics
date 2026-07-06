import { useState } from 'react'
import { RESOURCES, RESOURCE_ORDER } from '../data/resources'
import type { ResourceType } from '../types'
import { useGame } from '../state/store'
import { ResourceIcon } from './icons'

/** Tap-to-open legend naming each resource (icons are otherwise unlabeled). */
export function ResourceLegend({
  resources,
  onClose,
}: {
  resources: Record<ResourceType, number>
  onClose: () => void
}) {
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal panel stack" onClick={(e) => e.stopPropagation()}>
        <strong>Resources</strong>
        <div className="legend">
          {RESOURCE_ORDER.map((r) => (
            <div className="legend__row" key={r}>
              <span className="legend__icon"><ResourceIcon type={r} size={18} /></span>
              <div className="legend__main">
                <div className="legend__name">
                  {RESOURCES[r].name} <span className="muted legend__amt">· have {resources[r]}</span>
                </div>
                <div className="muted legend__blurb">{RESOURCES[r].blurb}</div>
              </div>
            </div>
          ))}
        </div>
        <p className="muted" style={{ fontSize: '0.8rem', margin: 0 }}>
          Territories produce their resource each day. Spend them on buildings and crafting.
        </p>
        <div className="modal__actions">
          <button className="btn btn--sm" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  )
}

/** Settings menu: New Game (with confirm) and tip controls. */
export function SettingsModal({ onClose }: { onClose: () => void }) {
  const newGame = useGame((s) => s.newGame)
  const [confirming, setConfirming] = useState(false)

  const doNewGame = () => {
    localStorage.removeItem('st_hideHints') // show first-run tips again
    newGame()
    onClose()
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal panel stack" onClick={(e) => e.stopPropagation()}>
        <strong>Settings</strong>

        {confirming ? (
          <div className="stack">
            <p className="muted" style={{ margin: 0 }}>
              Start a new game? This erases all current progress.
            </p>
            <div className="modal__actions">
              <button className="btn btn--ghost btn--sm" onClick={() => setConfirming(false)}>Cancel</button>
              <button className="btn btn--sm" onClick={doNewGame}>Erase & Start</button>
            </div>
          </div>
        ) : (
          <button className="btn btn--sm" onClick={() => setConfirming(true)}>New Game</button>
        )}

        <button
          className="btn btn--ghost btn--sm"
          onClick={() => {
            localStorage.removeItem('st_hideHints')
            onClose()
          }}
        >
          Show tips again
        </button>

        <p className="muted" style={{ fontSize: '0.78rem', margin: 0 }}>
          Steampunk Tactics — a tactics/territory game. Progress autosaves to this device.
        </p>
        <div className="modal__actions">
          <button className="btn btn--sm" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  )
}
