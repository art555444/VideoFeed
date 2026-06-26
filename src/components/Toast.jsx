import { IconCheck, IconX } from './Icons.jsx'

export function ToastContainer({ toasts }) {
  if (!toasts.length) return null
  return (
    <div className="toast-container" role="status" aria-live="polite" aria-atomic="false">
      {toasts.map(t => (
        <div key={t.id} className={`toast ${t.type}`}>
          {t.type === 'success' && <IconCheck />}
          {t.type === 'error' && <IconX />}
          {t.message}
        </div>
      ))}
    </div>
  )
}
