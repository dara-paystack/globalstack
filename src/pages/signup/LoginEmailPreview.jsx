import EmailPreviewShell from './EmailPreviewShell'

// LoginEmailPreview — the magic-link sign-in email a returning user receives.
// No email is actually sent in this prototype; this preview IS the design
// artifact. The shared EmailPreviewShell owns the brand frame; this file owns
// only the content.
//
// The CTA points at /dashboard because, in this prototype, the magic link is
// simulated by landing the user straight in the dashboard — AppShell then
// renders whatever account status is persisted. This matches LoginCheckEmail's
// "Continue to dashboard" button, which stands in for clicking the link.
//
// Sign-in mail is deliberately leaner than the welcome mail: no checklist, a
// short-lived link, and a "didn't request this" reassurance line in place of
// the verification security note.

export default function LoginEmailPreview({ open, onClose }) {
  return (
    <EmailPreviewShell open={open} onClose={onClose} ariaLabel="Sign-in email preview">
      {/* Heading — same 24px Linear scale as the welcome mail */}
      <h2 className="text-2xl font-semibold tracking-tight leading-tight text-content-primary mt-10">
        Sign in to GlobalStack
      </h2>
      <p className="text-sm text-content-secondary leading-relaxed mt-4">
        Click the button below to sign in to your GlobalStack dashboard. No
        password needed — this link signs you in.
      </p>

      {/* Single CTA — the magic link itself; lands the user in the dashboard */}
      <a
        href="/dashboard"
        className="inline-flex items-center mt-7 px-4 py-2.5 rounded-md bg-action-primary-main text-action-primary-contrast-text text-sm font-medium hover:opacity-90 transition-opacity"
      >
        Sign in to GlobalStack
      </a>

      {/* Validity line — magic links are short-lived and single-use */}
      <p className="text-sm text-content-tertiary leading-relaxed mt-7">
        This link expires in 15 minutes and can only be used once.
      </p>

      {/* Closing fine print — the standard "didn't request this" reassurance */}
      <p className="text-xs text-content-tertiary leading-relaxed mt-10">
        Didn&apos;t try to sign in? You can safely ignore this email — your
        account stays secure.
      </p>
    </EmailPreviewShell>
  )
}
