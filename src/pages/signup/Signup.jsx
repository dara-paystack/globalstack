import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { TextInput, Button } from '@paystack/pax'
import { useAccount } from '../../context/AccountContext'
import { OnboardingShell } from '../../components/layout/OnboardingShell'
import { useIsMobile } from '../../landing/hooks/useIsMobile'

// Signup — the first screen of self-service onboarding.
//
// Standalone route (no AppShell), like the landing page — but unlike the
// landing page it's built with Pax, since everything from here on is product
// surface and should match the dashboard's look.
//
// We collect only company name + email (Dara confirmed: no password — login
// is a separate magic-link feature later). On submit we POST to /api/signup,
// record who they are via AccountContext.register(), and hand off to the
// "check your email" screen.

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export default function Signup() {
  const navigate = useNavigate()
  const { register } = useAccount()

  // Globe backdrop is decorative and desktop-only — on mobile the form should
  // own the full screen.
  const isMobile = useIsMobile(1024)

  const [company, setCompany] = useState('')
  const [email, setEmail] = useState('')
  const [errors, setErrors] = useState({}) // { company?, email?, form? }
  const [submitting, setSubmitting] = useState(false)

  // Validate on submit (not per-keystroke) — live field errors while someone
  // is still typing their email read as nagging. We surface errors once they
  // commit by pressing Continue.
  function validate() {
    const next = {}
    if (!company.trim()) next.company = 'Enter your company name.'
    if (!email.trim()) next.email = 'Enter your work email.'
    else if (!EMAIL_RE.test(email.trim())) next.email = 'Enter a valid email address.'
    return next
  }

  async function handleSubmit(e) {
    e.preventDefault()
    const found = validate()
    setErrors(found)
    if (Object.keys(found).length > 0) return

    setSubmitting(true)
    try {
      const res = await fetch('/api/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ company: company.trim(), email: email.trim() }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Something went wrong. Please try again.')
      }

      // Capture identity (does NOT flip status — they're still pre-verification).
      register({ company: company.trim(), email: email.trim() })

      // Hand off to the confirmation screen. Pass details via router state so
      // it can greet them without another round-trip.
      navigate('/signup/check-email', {
        state: { company: company.trim(), email: email.trim() },
      })
    } catch (err) {
      setErrors({ form: err.message })
      setSubmitting(false)
    }
  }

  return (
    <OnboardingShell
      title="Create your account"
      backdrop={
        !isMobile && (
          // Static globe (captured from the marketing scene). Anchored
          // bottom-center and pushed mostly out of frame so only the top cap
          // rises from the bottom edge. translate-y-[75%] shows ~24px more than
          // the previous framing.
          <img
            src="/signup-globe.png"
            alt=""
            aria-hidden="true"
            className="absolute left-1/2 bottom-0 -translate-x-1/2 translate-y-[75%] w-[760px] h-[760px] max-w-none pointer-events-none select-none"
          />
        )
      }
    >
      {/* Form-level error (e.g. server rejected the request) */}
      {errors.form && (
        <div
          role="alert"
          className="px-3 py-2.5 rounded-lg bg-feedback-danger-light border border-feedback-danger-border"
        >
          <p className="text-xs text-feedback-danger-main">{errors.form}</p>
        </div>
      )}

      {/* noValidate: we run our own validation rather than the browser's,
          so error styling and copy stay consistent with the design system.
          Labels stay left-aligned inside the centered column. */}
      <form onSubmit={handleSubmit} noValidate className={`space-y-5 ${errors.form ? 'mt-5' : ''}`}>
        <div>
          <label htmlFor="signup-company" className="text-sm font-medium text-content-primary mb-2 block">
            Company name
          </label>
          <TextInput
            id="signup-company"
            type="text"
            autoFocus
            value={company}
            onChange={(e) => setCompany(e.target.value)}
            placeholder="Acme Corp"
            aria-invalid={errors.company ? 'true' : undefined}
            aria-describedby={errors.company ? 'signup-company-error' : undefined}
            className="w-full"
          />
          {errors.company && (
            <p id="signup-company-error" className="mt-1.5 text-xs text-feedback-danger-main">
              {errors.company}
            </p>
          )}
        </div>

        <div>
          <label htmlFor="signup-email" className="text-sm font-medium text-content-primary mb-2 block">
            Work email
          </label>
          <TextInput
            id="signup-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@acme.com"
            aria-invalid={errors.email ? 'true' : undefined}
            aria-describedby={errors.email ? 'signup-email-error' : undefined}
            className="w-full"
          />
          {errors.email && (
            <p id="signup-email-error" className="mt-1.5 text-xs text-feedback-danger-main">
              {errors.email}
            </p>
          )}
        </div>

        <Button
          type="submit"
          variant="default"
          color="primary"
          disabled={submitting}
          className="w-full cursor-pointer"
        >
          {submitting ? 'Creating account…' : 'Continue'}
        </Button>
      </form>

      {/* Returning users — Sign in currently routes into the dashboard.
          TODO(magic-link login): when the magic-link login feature lands,
          repoint this "/dashboard" href to the real login route.
          asChild renders the Pax text Button onto a real <a>; px-0 keeps it
          flush so it reads inline with the preceding sentence. */}
      <p className="text-sm text-content-secondary text-center mt-6">
        Already have an account?{' '}
        <Button asChild variant="text" color="primary" size="xs" className="px-0 align-baseline cursor-pointer">
          <a href="/dashboard">Sign in</a>
        </Button>
      </p>
    </OnboardingShell>
  )
}
