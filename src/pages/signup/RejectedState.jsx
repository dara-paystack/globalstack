import { useNavigate } from 'react-router-dom'
import { Button } from '@paystack/pax'
import { ShieldX, LogOut } from 'lucide-react'
import { useAccount } from '../../context/AccountContext'
import { OnboardingShell } from '../../components/layout/OnboardingShell'

// RejectedState — the terminal "verification unsuccessful" state.
//
// Unlike pending (read-only dashboard), a rejected merchant gets NO dashboard
// access at all. AppShell gates on isRejected and renders this full-page screen
// instead of the shell, so there's no sidebar/nav to wander into.
//
// Visually it matches the other onboarding screens via OnboardingShell:
// cardless white background, top-pinned logo, a lucide icon marker and centered
// title. The one action is "Contact support" — in a real product the next step
// is a human conversation, not a self-serve retry.
//
// In this prototype there's no real verdict; the floating demo switcher is what
// flips an account into and out of this state.
//
// LOG OUT: a rejected merchant would otherwise be stranded here. With no real
// auth, "log out" means clear the account state (reset() → defaults, wipes the
// persisted company/email) and return to the marketing landing page.
export default function RejectedState() {
  const navigate = useNavigate()
  const { company, reset } = useAccount()

  function handleLogout() {
    reset()
    navigate('/')
  }

  return (
    <OnboardingShell
      icon={
        <div className="w-11 h-11 rounded-full bg-feedback-danger-light flex items-center justify-center">
          <ShieldX width={20} height={20} strokeWidth={1.75} className="text-feedback-danger-main" />
        </div>
      }
      title="We couldn't verify your business"
      subtitle={
        <>
          {company ? (
            <>Unfortunately we weren&apos;t able to approve <span className="font-medium text-content-primary">{company}</span> for a GlobalStack account.</>
          ) : (
            <>Unfortunately we weren&apos;t able to approve your business for a GlobalStack account.</>
          )}{' '}
          This can happen for a few reasons — incomplete documents, details that didn&apos;t match, or activity outside what we currently support. If you think this was a mistake, our team can take another look.
        </>
      }
    >
      {/* asChild renders the Pax button styling onto a real <a>, so this is a
          proper mailto link (right-click, open, etc.) rather than a button
          faking navigation. */}
      <Button asChild variant="default" color="primary" className="w-full cursor-pointer">
        <a href="mailto:support@globalstack.com?subject=Verification%20review%20request">
          Contact support
        </a>
      </Button>

      {/* Log out — the escape hatch. Without it a rejected merchant is stranded
          here (no sidebar, no nav). reset() wipes the persisted account and
          returns to landing. A quiet text button keeps it secondary to
          "Contact support" above. */}
      <div className="text-center mt-6">
        <button
          onClick={handleLogout}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-content-secondary hover:text-content-primary transition-colors cursor-pointer"
        >
          <LogOut width={15} height={15} strokeWidth={1.75} />
          Log out
        </button>
      </div>
    </OnboardingShell>
  )
}
