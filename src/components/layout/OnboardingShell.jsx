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
//
// maxWidth — the centered column width. Defaults to max-w-sm (the short
//   Signup/CheckEmail/Rejected forms); VerifyIdentity widens it for the iframe.
// align — 'center' optically centers short content; 'top' anchors tall content
//   (the Sumsub iframe) just under the logo so it never overflows off-screen.
export function OnboardingShell({
  icon,
  title,
  subtitle,
  children,
  backdrop,
  maxWidth = 'max-w-sm',
  align = 'center',
}) {
  const region =
    align === 'top' ? 'justify-start pt-10' : 'justify-center pb-24'
  return (
    <div className="relative min-h-screen bg-surface-primary flex flex-col px-4 py-8 overflow-hidden">
      {/* Optional decorative backdrop (e.g. the globe on Signup). Rendered as the
          bottom layer: it paints above the white background but below the content,
          which sits in a relative/z-10 context. overflow-hidden on this container
          clips anything pushed past the viewport edges. */}
      {backdrop}

      {/* Logo — pinned to the top of the page, links home. Same asset the
          dashboard sidebar uses (/globalstack-logo.svg), at 24px for this
          focal auth screen. relative z-10 keeps it above the backdrop. */}
      <div className="relative z-10 flex justify-center">
        <a href="/" className="inline-block hover:opacity-70 transition-opacity">
          <img src="/globalstack-logo.svg" alt="GlobalStack" className="h-6 w-auto" />
        </a>
      </div>

      {/* Everything else sits in the remaining space. flex-1 absorbs the leftover
          height. align='center' (default): pb-24 (96px) nudges the optically
          centered block up by 48px. align='top': content anchors just under the
          logo so a tall iframe scrolls instead of being clipped. relative z-10
          keeps the content above the backdrop. */}
      <div className={`relative z-10 flex-1 flex flex-col items-center ${region}`}>
        <div className={`w-full ${maxWidth}`}>
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
          <div className="mt-10">{children}</div>
        </div>
      </div>
    </div>
  )
}
