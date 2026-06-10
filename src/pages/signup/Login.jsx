import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { TextInput, Button } from '@paystack/pax'
import { OnboardingShell, ONBOARDING_FORM_GAP } from '../../components/layout/OnboardingShell'
import { useIsMobile } from '../../landing/hooks/useIsMobile'

// Login — the returning-user entry point.
//
// Passwordless by design: signup never sets a password (Dara confirmed), so
// login is a magic link. We collect a work email, POST /api/login to "send"
// the link, then hand off to the check-email confirmation. The actual link
// (which would log them in) is simulated there with a "Continue" button, since
// this prototype has no real mail or auth backend.
//
// Standalone route (no AppShell), built with Pax — the front-door sibling of
// Signup. It deliberately shares Signup's frame (globe backdrop, OnboardingShell)
// so the two entry screens read as a matched pair.

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export default function Login() {
  const navigate = useNavigate()

  // Globe backdrop is decorative and desktop-only — matches Signup.
  const isMobile = useIsMobile(1024)

  const [email, setEmail] = useState('')
  const [errors, setErrors] = useState({}) // { email?, form? }
  const [submitting, setSubmitting] = useState(false)

  // Validate on submit, not per-keystroke — same reasoning as Signup: live
  // field errors while someone is mid-email read as nagging.
  function validate() {
    const next = {}
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
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Something went wrong. Please try again.')
      }

      // Login is routing-only — it does NOT touch AccountContext. Whatever
      // status is already persisted (approved / pending / rejected) is what the
      // dashboard will show once they "click" the link on the next screen.
      navigate('/login/check-email', { state: { email: email.trim() } })
    } catch (err) {
      setErrors({ form: err.message })
      setSubmitting(false)
    }
  }

  return (
    <OnboardingShell
      title="Sign in to GlobalStack"
      backdrop={
        !isMobile && (
          // Same static globe as Signup (see Signup.jsx for the framing math) —
          // keeps the two front-door screens visually identical.
          <img
            src="/signup-globe.png"
            alt=""
            aria-hidden="true"
            className="absolute left-1/2 bottom-0 -translate-x-1/2 translate-y-[76%] scale-[1.12] w-[760px] h-[760px] max-w-none pointer-events-none select-none"
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

      {/* noValidate: we run our own validation so error styling/copy stay
          consistent with the design system. */}
      <form onSubmit={handleSubmit} noValidate className={`${ONBOARDING_FORM_GAP} ${errors.form ? 'mt-5' : ''}`}>
        <div>
          <label htmlFor="login-email" className="text-sm font-medium text-content-primary mb-2 block">
            Work email
          </label>
          <TextInput
            id="login-email"
            type="email"
            autoFocus
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@acme.com"
            aria-invalid={errors.email ? 'true' : undefined}
            aria-describedby={errors.email ? 'login-email-error' : undefined}
            className="w-full"
          />
          {errors.email && (
            <p id="login-email-error" className="mt-1.5 text-xs text-feedback-danger-main">
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
          {submitting ? 'Sending link…' : 'Send sign-in link'}
        </Button>
      </form>

      {/* New users — route to signup. Mirrors Signup's footer link (inverted).
          asChild renders the Pax text Button onto a real <a>; px-0 keeps it
          flush so it reads inline with the preceding sentence. */}
      <p className="text-sm text-content-secondary text-center mt-6">
        Don&apos;t have an account?{' '}
        <Button asChild variant="text" color="primary" size="xs" className="px-0 align-baseline cursor-pointer">
          <a href="/signup">Create one</a>
        </Button>
      </p>
    </OnboardingShell>
  )
}
