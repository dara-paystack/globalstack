import { useNavigate } from 'react-router-dom'
import { Button } from '@paystack/pax'
import { ExternalLink, ShieldCheck } from 'lucide-react'
import { useAccount } from '../../context/AccountContext'

// VerifyIdentity — the Sumsub handoff.
//
// Sumsub hosts and designs the actual verification screens, so our job is just
// the entry/handoff: we embed their sandbox WebSDK in an iframe and provide a
// way to advance once the merchant is done.
//
// THE CONSTRAINT: this prototype has no backend, so we can't receive Sumsub's
// real review-result webhook. Finishing therefore always sets the account to
// 'pending' (under review) and drops the merchant into the dashboard. The demo
// switcher (Sidebar) is what flips between pending/approved/rejected for demos.
//
// We always offer an "open in a new tab" fallback: a cross-origin iframe that
// sets X-Frame-Options can refuse to embed, and the parent page can't detect
// that — so rather than guess, we give an unconditional escape hatch.

const SUMSUB_SANDBOX_URL = 'https://in.sumsub.com/websdk/p/sbx_GhNId8z1kLGG04yX'

export default function VerifyIdentity() {
  const navigate = useNavigate()
  const { setStatus } = useAccount()

  function handleFinished() {
    // No real verdict available — default to "under review".
    setStatus('pending')
    navigate('/dashboard')
  }

  return (
    <div className="min-h-screen bg-surface-secondary flex flex-col items-center px-4 py-10">
      <div className="w-full max-w-[640px]">
        <a
          href="/"
          className="inline-block mb-8 text-lg font-semibold tracking-tight text-content-primary hover:opacity-70 transition-opacity"
        >
          GlobalStack
        </a>

        <div className="bg-surface-primary border border-border-default rounded-2xl p-6 md:p-8 shadow-sm">
          <h1 className="text-2xl font-medium text-content-primary">Verify your business</h1>
          <p className="text-sm text-content-secondary mt-1.5 leading-relaxed">
            Complete the steps below to verify your business. This is handled securely by Sumsub.
          </p>

          {/* Embedded Sumsub WebSDK. allow=camera/microphone is required for
              document capture and liveness checks inside the iframe. */}
          <div className="mt-6 rounded-xl border border-border-default overflow-hidden bg-surface-secondary">
            <iframe
              title="Sumsub identity verification"
              src={SUMSUB_SANDBOX_URL}
              allow="camera; microphone; fullscreen"
              className="w-full"
              style={{ height: 620, border: 'none', display: 'block' }}
            />
          </div>

          {/* Fallback for when the iframe is blocked from framing */}
          <p className="text-xs text-content-tertiary mt-3 flex items-center gap-1.5">
            Having trouble loading the verification?
            <a
              href={SUMSUB_SANDBOX_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 font-medium text-content-secondary hover:text-content-primary transition-colors"
            >
              Open in a new tab
              <ExternalLink width={12} height={12} strokeWidth={2} />
            </a>
          </p>

          {/* Advance the flow. In production this would be gated on Sumsub's
              webhook; here it's an explicit "I'm done" since we can't receive it. */}
          <div className="mt-6 pt-6 border-t border-border-default">
            <Button
              variant="default"
              color="primary"
              onClick={handleFinished}
              className="w-full cursor-pointer"
            >
              I&apos;ve finished verification
            </Button>
            <p className="text-xs text-content-tertiary text-center mt-3 flex items-center justify-center gap-1.5">
              <ShieldCheck width={13} height={13} strokeWidth={2} className="text-content-tertiary" />
              We&apos;ll review your details and update your account status.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
