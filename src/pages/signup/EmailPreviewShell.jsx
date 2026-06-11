import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'

// EmailPreviewShell — the shared frame for our transactional email previews.
// No email is actually sent in this prototype; these previews ARE the design
// artifacts. The shell owns everything identical across emails: the portal +
// overlay, escape/focus-trap behaviour, the bare grey box, the white email
// card with the GlobalStack wordmark at its head, and the footer. Each email
// supplies only its unique middle (heading → CTA → fine print) as children, so
// the brand frame stays consistent across every email we send.

const FOCUSABLE = [
  'button:not([disabled])',
  'a[href]',
  '[tabindex]:not([tabindex="-1"])',
].join(', ')

export default function EmailPreviewShell({ open, onClose, ariaLabel = 'Email preview', children }) {
  const modalRef = useRef(null)

  // Escape-to-close + focus trap + initial focus — mirrors SendFundsModal.
  useEffect(() => {
    if (!open) return
    const modal = modalRef.current
    modal?.querySelector(FOCUSABLE)?.focus()

    function handleKeyDown(e) {
      if (e.key === 'Escape') return onClose()
      if (e.key === 'Tab' && modal) {
        const f = Array.from(modal.querySelectorAll(FOCUSABLE))
        const first = f[0]
        const last = f[f.length - 1]
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault()
          last?.focus()
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault()
          first?.focus()
        }
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [open, onClose])

  if (!open) return null

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto py-12"
      style={{ backgroundColor: 'rgba(0,0,0,0.45)' }}
      onClick={onClose}
    >
      {/* The preview is just a grey box with the email sitting inside it —
          no modal chrome, no meta strip, nothing extra. */}
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-label={ariaLabel}
        className="relative bg-surface-secondary rounded-2xl w-full max-w-2xl mx-4 px-4 py-12"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Minimal close affordance — the only chrome we keep */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 p-1.5 rounded-md text-content-tertiary hover:bg-surface-primary hover:text-content-primary transition-colors cursor-pointer"
          aria-label="Close preview"
        >
          <X width={16} height={16} strokeWidth={1.5} />
        </button>

        {/* The email itself — a single airy card; the wordmark floats at the
            top with whitespace below it, no header band/divider. */}
        <div className="max-w-[600px] mx-auto bg-surface-primary border border-border-default rounded-lg px-10 py-12 sm:px-12">
          <span className="text-lg font-semibold tracking-tight text-content-primary">GlobalStack</span>
          {children}
        </div>

        {/* Footer — outside the white card, on the grey box (Linear's
            "Linear Orbit Inc." sits below its card the same way). */}
        <div className="max-w-[600px] mx-auto mt-6 px-2">
          <p className="text-sm text-content-tertiary">
            Need help? <span className="text-content-secondary">support@globalstack.com</span>
          </p>
          <p className="text-xs text-content-quaternary mt-1.5">
            GlobalStack · stablecoin treasury infrastructure
          </p>
        </div>
      </div>
    </div>,
    document.body,
  )
}
