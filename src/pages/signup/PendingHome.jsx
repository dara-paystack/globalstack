import { useNavigate } from 'react-router-dom'
import { FileSearch, BookOpen, KeyRound, UsersRound, ArrowRight, ArrowUpRight } from 'lucide-react'
import { usePageTitle } from '../../lib/usePageTitle'
import { useAccount } from '../../context/AccountContext'
import { DOCS_URL } from '../../lib/pendingAccess'

// PendingHome — the "under review" status home for a merchant awaiting verification.
//
// This replaces the old pending experience (a full dashboard gated read-only, so
// every page rendered an empty zero-state). A dashboard full of zeros earns
// nothing — there's no test data to populate it at launch — so instead we tell
// the merchant plainly where they stand and hand them a few things worth doing
// while they wait. AppShell renders this in place of <Overview> at /dashboard
// whenever the account is pending; the sidebar around it locks everything except
// the surfaces these cards point to (docs, API keys, team).
//
// Unlike RejectedState (a terminal, chrome-less full-page screen), this lives
// inside the shell — the merchant IS in the product, just restricted — so it
// uses the dashboard's card visual language rather than OnboardingShell.

// ActionCard — one "while you wait" task. Internal cards navigate within the
// dashboard; the docs card is external (new tab). Same visual treatment either
// way; only the wrapper element (button vs anchor) and trailing glyph differ.
function ActionCard({ icon: Icon, title, description, to, href, external, trailing: Trailing }) {
  const navigate = useNavigate()

  // Vertical card: icon + trailing affordance share the top row, then the title
  // and description stack beneath. Hover/focus mirror Overview's clickable rows
  // (bg shift + inset focus ring) so these feel native to the dashboard.
  const className =
    'group flex flex-col w-full text-left rounded-xl border border-border-primary-light bg-surface-primary p-4 transition-colors cursor-pointer hover:bg-surface-secondary focus:outline-none focus-visible:ring-2 focus-visible:ring-action-primary-main focus-visible:ring-inset'

  const inner = (
    <>
      <div className="flex items-start justify-between">
        <span className="w-9 h-9 rounded-lg bg-surface-secondary group-hover:bg-surface-tertiary flex items-center justify-center shrink-0 transition-colors">
          <Icon size={17} strokeWidth={1.75} className="text-content-secondary" aria-hidden="true" />
        </span>
        <Trailing
          size={15}
          strokeWidth={1.75}
          className="text-content-tertiary group-hover:text-content-secondary shrink-0 transition-colors"
          aria-hidden="true"
        />
      </div>
      <span className="block text-sm font-medium text-content-primary mt-3">{title}</span>
      <span className="block text-xs text-content-tertiary mt-1 leading-snug">{description}</span>
    </>
  )

  if (external) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className={className}>
        {inner}
      </a>
    )
  }
  return (
    <button type="button" onClick={() => navigate(to)} className={className}>
      {inner}
    </button>
  )
}

export default function PendingHome() {
  usePageTitle('Account under review')
  const { company, email } = useAccount()

  return (
    <div className="space-y-10">
      {/* ── Status hero ─────────────────────────────────────────────────────────
          Light-blue (information) card. Flat status (no progress stepper): we don't
          get granular state back from Sumsub, so a stepper would be fiction — one
          clear message. Horizontal layout: text leads, a line illustration sits to
          the right on desktop. */}
      <div className="rounded-xl border border-feedback-information-border bg-feedback-information-light p-6 md:p-8 flex flex-col md:flex-row md:items-center gap-6">
        <div className="flex-1 min-w-0">
          <h1 className="text-xl lg:text-2xl font-semibold text-content-primary leading-snug">
            Your account is under review
          </h1>
          <p className="mt-2 text-sm text-content-secondary max-w-xl leading-relaxed">
            We&apos;re verifying{' '}
            {company ? (
              <span className="font-medium text-content-secondary">{company}</span>
            ) : (
              'your business'
            )}
            . Most reviews take{' '}
            <span className="font-medium text-content-secondary">3–5 business days</span>
            {email ? (
              <> — we&apos;ll email you at <span className="font-medium text-content-secondary">{email}</span> as soon as you&apos;re approved.</>
            ) : (
              <> — we&apos;ll email you as soon as you&apos;re approved.</>
            )}
          </p>
        </div>
        {/* Line illustration — a large thin-stroke lucide icon as a stand-in
            (project rule: lucide only, no inline SVG). Decorative, desktop-only.
            Swap for a bespoke illustration asset when one exists. */}
        <div className="hidden md:flex shrink-0 items-center justify-center text-feedback-information-main">
          <FileSearch width={88} height={88} strokeWidth={1} aria-hidden="true" />
        </div>
      </div>

      {/* ── While you wait ──────────────────────────────────────────────────────
          The point of this page: give the merchant momentum instead of a holding
          screen. Each card routes to a surface that works pre-approval — sandbox
          keys to start building, team invites to bring people in, docs to read. */}
      <div className="space-y-4">
        <h2 className="text-xs font-semibold uppercase tracking-[0.06em] text-content-tertiary">
          While you wait
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <ActionCard
            icon={BookOpen}
            title="Explore the docs"
            description="Read the API reference and integration guides."
            external
            href={DOCS_URL}
            trailing={ArrowUpRight}
          />
          <ActionCard
            icon={KeyRound}
            title="Grab your sandbox keys"
            description="Start building now — live keys activate on approval."
            to="/dashboard/settings/api-key"
            trailing={ArrowRight}
          />
          <ActionCard
            icon={UsersRound}
            title="Invite your team"
            description="Add teammates so they're ready when you go live."
            to="/dashboard/settings/team"
            trailing={ArrowRight}
          />
        </div>

        {/* Quiet escape hatch for a stuck/anxious applicant. Secondary to the cards. */}
        <p className="text-xs text-content-tertiary pt-2">
          Questions about your application?{' '}
          <a
            href="mailto:support@globalstack.com?subject=Account%20under%20review"
            className="font-medium text-action-primary-main hover:text-action-primary-dark transition-colors"
          >
            Contact support
          </a>
        </p>
      </div>
    </div>
  )
}
