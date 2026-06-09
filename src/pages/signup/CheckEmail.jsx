import { useLocation } from 'react-router-dom'

// CheckEmail — STUB (completed in Build Step 4).
//
// Confirms the welcome email was "sent" and offers the path into Sumsub
// verification. For now it just proves the signup form's success path lands
// here with the right router state. Step 4 adds the welcome-email preview and
// the "Continue verification" handoff.
export default function CheckEmail() {
  const { state } = useLocation()
  const email = state?.email
  const company = state?.company

  return (
    <div className="min-h-screen bg-surface-secondary flex flex-col items-center justify-center px-4 py-10">
      <div className="w-full max-w-[440px] bg-surface-primary border border-border-default rounded-2xl p-6 md:p-8 shadow-sm text-center">
        <h1 className="text-2xl font-medium text-content-primary">Check your email</h1>
        <p className="text-sm text-content-secondary mt-1.5">
          {email
            ? <>We&apos;ve sent a verification link to <span className="font-medium text-content-primary">{email}</span>.</>
            : 'We’ve sent you a verification link.'}
        </p>
        {company && (
          <p className="text-xs text-content-tertiary mt-4">Account: {company}</p>
        )}
        <p className="text-xs text-content-quaternary mt-6">
          (Step 4 will add the email preview + the verification handoff.)
        </p>
      </div>
    </div>
  )
}
