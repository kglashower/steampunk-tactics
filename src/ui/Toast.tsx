import { useEffect } from 'react'
import { useGame } from '../state/store'

/**
 * Brief success/notice feedback for consequential actions (craft, build,
 * learn, unlock…). Reads the single active toast from the store and clears it
 * after a short delay. Keyed by toast id so a fresh toast restarts the timer.
 */
export function Toast() {
  const toast = useGame((s) => s.toast)
  const dismiss = useGame((s) => s.dismissToast)

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(dismiss, 1800)
    return () => clearTimeout(t)
  }, [toast, dismiss])

  if (!toast) return null

  return (
    <div className="toast" role="status" aria-live="polite" key={toast.id}>
      <span className="toast__check" aria-hidden>✓</span>
      <span>{toast.text}</span>
    </div>
  )
}
