import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Button } from '@paystack/pax'
import { Mail } from 'lucide-react'
import { useAccount } from '../../context/AccountContext'
import WelcomeEmailPreview from './WelcomeEmailPreview'

// CheckEmail — post-signup confirmation + the handoff into verification.
//
// Two paths forward, both landing at the same place (Dara: both valid):
//   • "Continue verification" — the embedded in-app flow (→ /onboarding/verify)
//   • "Preview welcome email"  — shows the email whose CTA points to the same route
//
// Details come from router state (passed by the signup form); we fall back to
// AccountContext so a direct visit to this URL still renders sensibly.
export default function CheckEmail() {
  const navigate = useNavigate()
  const { state } = useLocation()
  const account = useAccount()

  const email = state?.email || account.email
  const company = state?.company || account.company

  const [previewOpen, setPreviewOpen] = useState(false)

  return (
    <div className="min-h-screen bg-surface-secondary flex flex-col items-center justify-center px-4 py-10">
      <div className="w-full max-w-[440px]">
        <a
          href="/"
          className="inline-block mb-8 text-lg font-semibold tracking-tight text-content-primary hover:opacity-70 transition-opacity"
        >
          GlobalStack
        </a>

        <div className="bg-surface-primary border border-border-default rounded-2xl p-6 md:p-8 shadow-sm">
          {/* Icon marker */}
          <div className="w-11 h-11 rounded-full bg-feedback-information-light flex items-center justify-center">
            <Mail width={20} height={20} strokeWidth={1.75} className="text-feedback-information-main" />
          </div>

          <h1 className="text-2xl font-medium text-content-primary mt-4">Check your email</h1>
          <p className="text-sm text-content-secondary mt-1.5 leading-relaxed">
            {email ? (
              <>We&apos;ve sent a verification link to <span className="font-medium text-content-primary">{email}</span>. Open it to verify your business and activate your account.</>
            ) : (
              <>We&apos;ve sent you a verification link. Open it to verify your business and activate your account.</>
            )}
          </p>

          <div className="mt-6 space-y-3">
            {/* Embedded path — continue verification in-app */}
            <Button
              variant="default"
              color="primary"
              onClick={() => navigate('/onboarding/verify')}
              className="w-full cursor-pointer"
            >
              Continue verification
            </Button>

            {/* Inspect the email we'd send (the designed artifact) */}
            <Button
              variant="outline"
              color="secondary"
              onClick={() => setPreviewOpen(true)}
              className="w-full cursor-pointer"
            >
              Preview welcome email
            </Button>
          </div>

          {/* Resend — UI-only stub in this prototype (no real mail sends) */}
          <p className="text-xs text-content-tertiary text-center mt-5">
            Didn&apos;t get the email?{' '}
            <button
              type="button"
              onClick={() => setPreviewOpen(true)}
              className="font-medium text-content-secondary hover:text-content-primary transition-colors cursor-pointer"
            >
              View it here
            </button>
          </p>
        </div>
      </div>

      <WelcomeEmailPreview
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        company={company}
        email={email}
      />
    </div>
  )
}
