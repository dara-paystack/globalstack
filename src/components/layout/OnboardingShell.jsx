// OnboardingShell — the shared frame for every pre-dashboard onboarding screen
// (Signup, CheckEmail, VerifyIdentity, RejectedState).
//
// Cardless by design: content sits directly on a clean white background in a
// centered max-w-md column — no card, border, or shadow. This matches the
// reference pattern the team locked on (Linear / ChatGPT / Cursor login):
// logo → title → content → footer link, all in one centered column.
//
// CENTERING RULE: the wordmark, optional icon marker, title, and subtitle are
// center-aligned. The `children` slot (forms, actions, footer links) is left
// untouched so field labels keep reading left-aligned — each screen owns the
// alignment of its own content.
//
// Owning these decisions here (background, centering, max-width, wordmark, title
// scale) means a future shell tweak propagates to all four screens at once.
export function OnboardingShell({ icon, title, subtitle, children }) {
  return (
    <div className="min-h-screen bg-surface-primary flex flex-col px-4 py-8">
      {/* Logo — pinned to the top of the page, links home. Same asset the
          dashboard sidebar uses (/globalstack-logo.svg), at 24px for this
          focal auth screen. */}
      <div className="flex justify-center">
        <a href="/" className="inline-block hover:opacity-70 transition-opacity">
          <img src="/globalstack-logo.svg" alt="GlobalStack" className="h-6 w-auto" />
        </a>
      </div>

      {/* Everything else sits centered in the remaining space. flex-1 lets this
          region absorb the leftover height so the column reads optically centered
          below the top-pinned logo. */}
      <div className="flex-1 flex flex-col items-center justify-center">
        <div className="w-full max-w-sm">
          {/* Optional icon marker — CheckEmail / VerifyIdentity / RejectedState use one. */}
          {icon && <div className="flex justify-center">{icon}</div>}

          {/* Title — 20px / semibold, centered. mt only when an icon sits above it. */}
          {title && (
            <h1
              className={`text-xl font-semibold text-content-primary text-center ${icon ? 'mt-4' : ''}`}
            >
              {title}
            </h1>
          )}

          {/* Subtitle — 14px, centered. */}
          {subtitle && (
            <p className="text-sm text-content-secondary text-center mt-2">{subtitle}</p>
          )}

          {/* Content slot — forms / actions / footer links, alignment left to the screen. */}
          <div className="mt-8">{children}</div>
        </div>
      </div>
    </div>
  )
}
