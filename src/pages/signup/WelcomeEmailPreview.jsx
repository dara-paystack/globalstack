import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { X, ArrowRight, Lock, Check } from 'lucide-react'

// WelcomeEmailPreview — renders the welcome/verification email as a preview
// inside a modal. No email is actually sent in this prototype; this preview
// IS the design artifact for that email.
//
// Built to look email-style: a constrained ~600px canvas with a faux
// From/Subject meta strip, a single prominent CTA, an expectation-setting
// checklist, and a trust/security line — the structure our research pointed to
// (single CTA, friendly tone, set expectations, reassure on security).
//
// The CTA points at /onboarding/verify — the SAME destination as the
// in-dashboard handoff — so the "email link" and "embedded flow" paths both
// land in one place (Dara: both can be primary).
//
// Icons are lucide (not emoji) per the project's icon convention.

const FOCUSABLE = [
  'button:not([disabled])',
  'a[href]',
  '[tabindex]:not([tabindex="-1"])',
].join(', ')

export default function WelcomeEmailPreview({ open, onClose, company, email }) {
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

  const companyLabel = company || 'there'

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ backgroundColor: 'rgba(0,0,0,0.45)' }}
      onClick={onClose}
    >
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="email-preview-title"
        className="relative bg-surface-primary rounded-2xl shadow-xl w-full max-w-xl mx-4 flex flex-col"
        style={{ maxHeight: 'calc(100vh - 48px)' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal header — names the preview + makes clear nothing is sent */}
        <div className="flex items-start justify-between px-6 py-4 border-b border-border-default shrink-0">
          <div>
            <div id="email-preview-title" className="text-base font-semibold text-content-primary">
              Welcome email preview
            </div>
            <p className="text-xs text-content-tertiary mt-0.5">
              Preview only — no email is sent in this prototype.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-md text-content-tertiary hover:bg-surface-secondary hover:text-content-primary transition-colors cursor-pointer shrink-0"
            aria-label="Close preview"
          >
            <X width={16} height={16} strokeWidth={1.5} />
          </button>
        </div>

        {/* Scrollable body — the email canvas sits on a muted backdrop */}
        <div className="flex-1 overflow-y-auto bg-surface-secondary px-4 py-6">
          {/* Faux email meta strip — sells the "this is an email" feel */}
          <div className="max-w-[600px] mx-auto mb-3 px-1 text-xs text-content-tertiary space-y-0.5">
            <div><span className="text-content-secondary font-medium">From:</span> GlobalStack &lt;hello@globalstack.com&gt;</div>
            <div><span className="text-content-secondary font-medium">To:</span> {email || 'you@company.com'}</div>
            <div><span className="text-content-secondary font-medium">Subject:</span> Verify your business to activate GlobalStack</div>
          </div>

          {/* The email itself */}
          <div className="max-w-[600px] mx-auto bg-surface-primary border border-border-default rounded-xl overflow-hidden">
            {/* Email header band */}
            <div className="px-8 py-5 border-b border-border-default">
              <span className="text-lg font-semibold tracking-tight text-content-primary">GlobalStack</span>
            </div>

            {/* Email body */}
            <div className="px-8 py-7">
              <h2 className="text-xl font-semibold text-content-primary">
                Welcome to GlobalStack, {companyLabel}
              </h2>
              <p className="text-sm text-content-secondary leading-relaxed mt-3">
                You&apos;re almost there. The last step is to verify your business so we can
                activate your account — it takes about 5 minutes.
              </p>

              {/* Single, prominent CTA — points at the shared verification route */}
              <a
                href="/onboarding/verify"
                className="inline-flex items-center gap-2 mt-6 px-5 py-3 rounded-xl bg-action-primary-main text-content-inverse text-sm font-medium hover:opacity-90 transition-opacity"
              >
                Verify your business
                <ArrowRight width={16} height={16} strokeWidth={2} />
              </a>

              {/* Expectation-setting checklist — lets them gather docs first,
                  which cuts mid-verification drop-off */}
              <div className="mt-7">
                <p className="text-sm font-medium text-content-primary">What you&apos;ll need</p>
                <ul className="mt-3 space-y-2">
                  {['Business registration details', 'A government-issued ID for the signatory'].map((item) => (
                    <li key={item} className="flex items-start gap-2.5 text-sm text-content-secondary">
                      <Check width={15} height={15} strokeWidth={2.5} className="mt-0.5 shrink-0 text-feedback-success-main" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Trust / security line */}
              <div className="mt-7 flex items-start gap-2.5 px-3.5 py-3 rounded-lg bg-surface-secondary">
                <Lock width={15} height={15} strokeWidth={2} className="mt-0.5 shrink-0 text-content-tertiary" />
                <p className="text-xs text-content-tertiary leading-relaxed">
                  Your data is encrypted and never shared. Verification is powered by Sumsub.
                </p>
              </div>
            </div>

            {/* Email footer */}
            <div className="px-8 py-5 border-t border-border-default">
              <p className="text-xs text-content-tertiary">
                Need help? <span className="text-content-secondary">support@globalstack.com</span>
              </p>
              <p className="text-xs text-content-quaternary mt-1">
                GlobalStack · stablecoin treasury infrastructure
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  )
}
