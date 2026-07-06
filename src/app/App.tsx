import { useEffect } from 'react'
import { useGame } from '../state/store'
import { loadGame } from '../state/persistence'
import { AppShell } from '../ui/AppShell'
import './app.css'

export function App() {
  const ready = useGame((s) => s.ready)
  const hydrate = useGame((s) => s.hydrate)
  const newGame = useGame((s) => s.newGame)

  // On first load: restore a save if present, otherwise start a new game.
  useEffect(() => {
    let cancelled = false
    loadGame().then((saved) => {
      if (cancelled) return
      if (saved) hydrate(saved)
      else newGame()
    })
    return () => {
      cancelled = true
    }
  }, [hydrate, newGame])

  if (!ready) {
    return (
      <div className="boot">
        <div className="boot__gear" aria-hidden />
        <p className="muted">Stoking the boilers…</p>
      </div>
    )
  }

  return <AppShell />
}
