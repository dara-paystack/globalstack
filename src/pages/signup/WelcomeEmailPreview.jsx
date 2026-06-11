import { Check } from 'lucide-react'
import EmailPreviewShell from './EmailPreviewShell'

// WelcomeEmailPreview — the welcome/verification email a new signup receives.
// No email is actually sent in this prototype; this preview IS the design
// artifact. The shared EmailPreviewShell owns the brand frame (grey box, white
// card, wordmark, footer); this file owns only the email's content.
//
// The CTA points at /onboarding/verify — the SAME destination as the
// in-dashboard handoff — so the "email link" and "embedded flow" paths both
// land in one place.

export default function WelcomeEmailPreview({ open, onClose, company }) {
  const companyLabel = company || 'there'

  return (
    <EmailPreviewShell open={open} onClose={onClose} ariaLabel="Welcome email preview">
      {/* Heading — Linear scale: 24px, with a generous gap from the logo */}
      <h2 className="text-2xl font-semibold tracking-tight leading-tight text-content-primary mt-10">
        Welcome to GlobalStack, {companyLabel}
      </h2>
      <p className="text-sm text-content-secondary leading-relaxed mt-4">
        You&apos;re almost there. The last step is to verify your business so we can
        activate your account — it takes about 5 minutes.
      </p>

      {/* Single, prominent CTA — content-width, points at the shared route */}
      <a
        href="/onboarding/verify"
        className="inline-flex items-center mt-7 px-4 py-2.5 rounded-md bg-action-primary-main text-action-primary-contrast-text text-sm font-medium hover:opacity-90 transition-opacity"
      >
        Verify your business
      </a>

      {/* Validity line — plain helper copy, Linear's "valid for 24 hours" beat */}
      <p className="text-sm text-content-tertiary leading-relaxed mt-7">
        This link will be valid for the next 24 hours.
      </p>

      {/* Expectation-setting checklist — lets them gather docs first, which
          cuts mid-verification drop-off */}
      <div className="mt-8">
        <p className="text-sm font-medium text-content-primary">What you&apos;ll need</p>
        <ul className="mt-3 space-y-2.5">
          {['Business registration details', 'A government-issued ID for the signatory'].map((item) => (
            <li key={item} className="flex items-start gap-2.5 text-sm text-content-secondary">
              <Check width={15} height={15} strokeWidth={2.5} className="mt-0.5 shrink-0 text-feedback-success-main" />
              {item}
            </li>
          ))}
        </ul>
      </div>

      {/* Closing fine print — plain muted text at the foot of the email (no
          box, no icon), the way Linear closes with quiet copy. */}
      <p className="text-xs text-content-tertiary leading-relaxed mt-10">
        Your data is encrypted and never shared. Verification is powered by Sumsub.
      </p>
    </EmailPreviewShell>
  )
}
