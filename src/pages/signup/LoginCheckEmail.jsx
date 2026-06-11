import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Button } from '@paystack/pax'
import { Mail } from 'lucide-react'
import { useAccount } from '../../context/AccountContext'
import { OnboardingShell } from '../../components/layout/OnboardingShell'
import LoginEmailPreview from './LoginEmailPreview'

// LoginCheckEmail — the post-login confirmation screen.
//
// Mirrors the signup CheckEmail screen, but for the magic-link sign-in: we've
// "sent" a link and the user would click it in their inbox to land in the
// dashboard. This prototype has no real mail, so the link is simulated by the
// "Continue to dashboard" button — pressing it is the equivalent of clicking
// the link.
//
// Login is routing-only: we don't change account status here. navigate() drops
// the user into /dashboard and AppShell renders whatever their persisted status
// is (approved / pending / rejected).
//
// Email comes from router state (passed by the login form); a direct visit
// falls back to AccountContext, and renders sensibly even with neither.
export default function LoginCheckEmail() {
  const navigate = useNavigate()
  const { state } = useLocation()
  const account = useAccount()

  const email = state?.email || account.email

  const [previewOpen, setPreviewOpen] = useState(false)

  return (
    <OnboardingShell
      icon={
        <div className="w-11 h-11 rounded-full bg-feedback-information-light flex items-center justify-center">
          <Mail width={20} height={20} strokeWidth={1.75} className="text-feedback-information-main" />
        </div>
      }
      title="Check your email"
      subtitle={
        email ? (
          <>We&apos;ve sent a sign-in link to <span className="font-medium text-content-primary">{email}</span>. Open it to access your dashboard.</>
        ) : (
          <>We&apos;ve sent you a sign-in link. Open it to access your dashboard.</>
        )
      }
    >
      <div className="space-y-3">
        {/* Simulated magic-link click — in production the link in the email is
            what lands the user here; this button stands in for it. */}
        <Button
          variant="default"
          color="primary"
          onClick={() => navigate('/dashboard')}
          className="w-full cursor-pointer"
        >
          Continue to dashboard
        </Button>

        {/* Inspect the email we'd send (the designed artifact) */}
        <Button
          variant="outline"
          color="secondary"
          onClick={() => setPreviewOpen(true)}
          className="w-full cursor-pointer"
        >
          Preview sign-in email
        </Button>
      </div>

      {/* Resend — UI-only stub in this prototype (no real mail sends). */}
      <p className="text-sm text-content-secondary text-center mt-5">
        Didn&apos;t get the email?{' '}
        <Button
          variant="text"
          color="primary"
          size="xs"
          onClick={() => navigate('/login')}
          className="px-0 align-baseline cursor-pointer"
        >
          Try a different email
        </Button>
      </p>

      <LoginEmailPreview open={previewOpen} onClose={() => setPreviewOpen(false)} />
    </OnboardingShell>
  )
}
