import { useNavigate } from 'react-router-dom'
import { Button } from '@paystack/pax'
import { ExternalLink, ShieldCheck } from 'lucide-react'
import { useAccount } from '../../context/AccountContext'
import { OnboardingShell } from '../../components/layout/OnboardingShell'

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
    <OnboardingShell
      title="Verify your business"
      subtitle="Complete the steps below to verify your business. This is handled securely by Sumsub."
      maxWidth="max-w-2xl"
      align="top"
    >
      {/* Embedded Sumsub WebSDK — now the ONLY card on the page. The shell
          provides the white background, logo and centered header; everything
          else (fallback link, finish button) sits directly on that background.
          allow=camera/microphone is required for document capture and liveness
          checks inside the iframe. */}
      <div className="rounded-xl border border-border-default overflow-hidden bg-surface-secondary">
        <iframe
          title="Sumsub identity verification"
          src={SUMSUB_SANDBOX_URL}
          allow="camera; microphone; fullscreen"
          className="w-full"
          style={{ height: 620, border: 'none', display: 'block' }}
        />
      </div>

      {/* Fallback for when the iframe is blocked from framing. Centered to sit
          with the cardless, centered layout. */}
      <p className="text-xs text-content-tertiary mt-3 flex items-center justify-center gap-1.5">
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
          webhook; here it's an explicit "I'm done" since we can't receive it.
          The card's top border/divider is gone — the button now floats on the
          background, so we keep it to a comfortable form width rather than the
          full iframe width. */}
      <div className="mt-8 max-w-sm mx-auto">
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
    </OnboardingShell>
  )
}
