import { Button } from '@paystack/pax'
import { ShieldX } from 'lucide-react'
import { useAccount } from '../../context/AccountContext'

// RejectedState — the terminal "verification unsuccessful" state.
//
// Unlike pending (read-only dashboard), a rejected merchant gets NO dashboard
// access at all. AppShell gates on isRejected and renders this full-page screen
// instead of the shell, so there's no sidebar/nav to wander into.
//
// Visually it matches the other onboarding screens (Signup/CheckEmail/
// VerifyIdentity): a centered Pax card on the muted surface, GlobalStack
// wordmark, lucide icon marker. The one action is "Contact support" — in a real
// product the next step is a human conversation, not a self-serve retry.
//
// In this prototype there's no real verdict; the demo switcher (Sidebar) is what
// flips an account into and out of this state.
export default function RejectedState() {
  const { company } = useAccount()

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
          {/* Danger marker */}
          <div className="w-11 h-11 rounded-full bg-feedback-danger-light flex items-center justify-center">
            <ShieldX width={20} height={20} strokeWidth={1.75} className="text-feedback-danger-main" />
          </div>

          <h1 className="text-2xl font-medium text-content-primary mt-4">
            We couldn&apos;t verify your business
          </h1>
          <p className="text-sm text-content-secondary mt-1.5 leading-relaxed">
            {company ? (
              <>Unfortunately we weren&apos;t able to approve <span className="font-medium text-content-primary">{company}</span> for a GlobalStack account.</>
            ) : (
              <>Unfortunately we weren&apos;t able to approve your business for a GlobalStack account.</>
            )}{' '}
            This can happen for a few reasons — incomplete documents, details that didn&apos;t match, or activity outside what we currently support.
          </p>

          <p className="text-sm text-content-secondary mt-3 leading-relaxed">
            If you think this was a mistake, our team can take another look.
          </p>

          <div className="mt-6">
            {/* asChild renders the Pax button styling onto a real <a>, so this is
                a proper mailto link (right-click, open, etc.) rather than a button
                faking navigation. */}
            <Button asChild variant="default" color="primary" className="w-full cursor-pointer">
              <a href="mailto:support@globalstack.com?subject=Verification%20review%20request">
                Contact support
              </a>
            </Button>
          </div>
        </div>

        <p className="text-sm text-content-secondary text-center mt-6">
          Questions? Reach us at{' '}
          <a
            href="mailto:support@globalstack.com"
            className="font-medium text-content-primary hover:opacity-70 transition-opacity"
          >
            support@globalstack.com
          </a>
        </p>
      </div>
    </div>
  )
}
