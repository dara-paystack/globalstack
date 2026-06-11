// Sidebar — responsive navigation for all three breakpoints.
//
// DESKTOP (lg: 1024px+):
//   Full 224px, always visible. Labels, wordmark, merchant identity all shown.
//
// TABLET (md: 768px–1023px):
//   56px icon-only rail, always visible (matched by AppShell's md:ml-14 offset).
//   Labels hidden via CSS: "block md:hidden lg:block" (hides on tablet only).
//   When isTabletExpanded=true: sidebar overlays content at 224px.
//     Labels, wordmark, merchant name shown via "isTabletExpanded ? 'block' : ..." guards.
//     Backdrop (z-20) behind it; clicking closes. No push — content stays offset at 56px.
//   Expand/collapse chevron button at bottom of rail (hidden md:flex lg:hidden).
//
// MOBILE (< md):
//   280px, translateX(-100%) by default, slides in on hamburger tap.
//   Content area shifts right 280px (push — AppShell margin-left transitions).
//   Backdrop (z-20) covers content. Full labels/wordmark/identity shown.
//   X button at top of sidebar for explicit dismissal.
//   nav items: min-h-[48px] (44px+ touch target; standard from Apple HIG + WCAG 2.5.5).
//
// NAV ITEM LABEL VISIBILITY:
//   Uses context (useSidebar) to know if tablet is expanded.
//   CSS: isTabletExpanded ? 'block' : 'block md:hidden lg:block'
//   Means: always show except on tablet-collapsed.

import { NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, ArrowLeftRight, Wallet, Users, KeyRound, Webhook,
  ClipboardList, Contact, UsersRound, Terminal, ChevronRight, ChevronLeft, X,
  ChevronsUpDown, LogOut,
} from 'lucide-react'
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem,
} from '@paystack/pax'
import { useMode } from '../../context/ModeContext'
import { useSidebar } from '../../context/SidebarContext'
import { useAccount } from '../../context/AccountContext'
import { PENDING_REACHABLE_PATHS } from '../../lib/pendingAccess'

const NAV_MAIN = [
  { to: '/dashboard', label: 'Overview', end: true, icon: LayoutDashboard },
  { to: '/dashboard/transactions', label: 'Transactions', icon: ArrowLeftRight },
  { to: '/dashboard/accounts', label: 'Accounts', icon: Wallet },
  { to: '/dashboard/recipients', label: 'Recipients', icon: Contact },
  { to: '/dashboard/customers', label: 'Customers', icon: Users },
]

const NAV_DEVELOPER = [
  { to: '/dashboard/developer/webhooks', label: 'Webhooks', icon: Webhook },
  { to: '/dashboard/developer/request-log', label: 'Request Logs', icon: Terminal },
]

const NAV_ADMIN = [
  { to: '/dashboard/settings/api-key', label: 'API Keys', icon: KeyRound },
  { to: '/dashboard/settings/audit-log', label: 'Audit Logs', icon: ClipboardList },
  { to: '/dashboard/settings/team', label: 'Team', icon: UsersRound },
]

// NavItem uses SidebarContext directly to compute label visibility.
// This avoids threading a prop through every call site in the nav groups.
function NavItem({ to, label, end, icon: Icon }) {
  const { isTabletExpanded } = useSidebar()

  // Label visibility:
  //   Tablet collapsed: hidden (md:hidden hides it, lg:block restores on desktop)
  //   Tablet expanded:  force 'block' to override the md:hidden CSS rule
  //   Mobile + desktop: 'block md:hidden lg:block' shows it (default = mobile visible)
  const labelClass = isTabletExpanded ? 'block' : 'block md:hidden lg:block'

  // title attribute gives a native tooltip on tablet icon-only mode.
  // Harmless on mobile/desktop where the label is already visible.
  return (
    <NavLink
      to={to}
      end={end}
      title={label}
      className={({ isActive }) =>
        [
          // min-h-[48px] provides 44px+ touch target on all breakpoints.
          // On desktop it makes rows slightly taller than before (~40px) — acceptable.
          'flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer',
          // Icon-only (tablet collapsed): center the icon since there's no label
          isTabletExpanded ? '' : 'md:justify-center lg:justify-start',
          isActive
            ? 'bg-surface-tertiary text-content-primary'
            : 'text-content-tertiary hover:bg-surface-secondary hover:text-content-primary',
        ].join(' ')
      }
    >
      {Icon && <Icon size={15} strokeWidth={1.75} className="shrink-0" />}
      <span className={labelClass}>{label}</span>
    </NavLink>
  )
}

export function Sidebar() {
  const { setMode, isTestMode } = useMode()
  const { isMobileOpen, isTabletExpanded, closeMobileSidebar, toggleTabletExpanded } = useSidebar()
  const { reset, isReadOnly } = useAccount()
  const navigate = useNavigate()

  function toggleMode() {
    setMode(isTestMode ? 'live' : 'test')
  }

  // Log out — no real auth in this prototype, so "log out" means clear the
  // persisted account (reset() → defaults) and return to the marketing landing.
  // Same semantics as RejectedState's logout.
  function handleLogout() {
    reset()
    navigate('/')
  }

  // Visibility helpers for elements that show on mobile + desktop but hide on
  // tablet icon-only. Pattern: 'block md:hidden lg:block'.
  // When isTabletExpanded, force 'block' (flex) to override.
  function showOnMobileAndDesktop(displayVal = 'block') {
    return isTabletExpanded ? displayVal : `${displayVal} md:hidden lg:${displayVal}`
  }

  // Elements that show ONLY on tablet icon-only mode.
  // Pattern: 'hidden md:flex lg:hidden'. Hidden when expanded.
  function showOnTabletOnly(displayVal = 'flex') {
    return isTabletExpanded ? 'hidden' : `hidden md:${displayVal} lg:hidden`
  }

  return (
    <aside
      className={[
        'fixed top-0 left-0 h-screen bg-[var(--midnight-100)] border-r border-border-primary-light flex flex-col z-30',
        // Width: mobile=280px, tablet-collapsed=56px, tablet-expanded=224px, desktop=224px
        'w-[280px]',
        isTabletExpanded ? 'md:w-56' : 'md:w-14',
        'lg:w-56',
        // Mobile: hidden (translateX) until isMobileOpen. Tablet+: always visible.
        isMobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0',
        // Animate both transform (mobile slide) and width (tablet expand).
        'transition-[transform,width] duration-[220ms] ease-out',
        // Clip content during width animation
        'overflow-hidden',
      ].join(' ')}
    >
      {/* ── Mobile close button ─────────────────────────────────────────────── */}
      {/* Gives explicit dismissal without needing to find the backdrop. md:hidden. */}
      <div className="md:hidden flex items-center justify-between px-4 pt-3 pb-1 shrink-0">
        <span className="text-xs font-medium text-content-tertiary">Navigation</span>
        <button
          onClick={closeMobileSidebar}
          className="w-11 h-11 flex items-center justify-center text-content-tertiary hover:text-content-primary transition-colors cursor-pointer rounded-lg"
          aria-label="Close navigation"
        >
          <X size={16} strokeWidth={1.75} />
        </button>
      </div>

      {/* ── Wordmark row ────────────────────────────────────────────────────── */}
      <div className="px-5 pt-6 pb-8 flex items-center justify-between gap-2 shrink-0">
        {/* Full logo — mobile + desktop + tablet-expanded */}
        <img
          src="/globalstack-logo.svg"
          alt="GlobalStack"
          className={`h-5 w-auto shrink-0 ${showOnMobileAndDesktop()}`}
        />

        {/* "GS" logomark — tablet icon-only only */}
        <div
          className={`w-7 h-7 rounded-lg bg-action-primary-main items-center justify-center text-content-inverse text-xs font-bold shrink-0 ${showOnTabletOnly()}`}
          aria-hidden="true"
        >
          GS
        </div>

        {/* Mode toggle pill — hidden on tablet (no room at 56px), visible otherwise.
            Suppressed entirely while pending: a Test/Live toggle is meaningless with
            no data behind it and an account that isn't live yet. */}
        {!isReadOnly && (
          <button
            onClick={toggleMode}
            aria-label={`Switch to ${isTestMode ? 'live' : 'test'} mode`}
            aria-pressed={isTestMode}
            className={[
              'items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium border transition-colors cursor-pointer shrink-0',
              isTestMode
                ? 'border-feedback-warning-border bg-feedback-warning-light text-feedback-warning-dark'
                : 'border-border-primary-light bg-surface-secondary text-content-secondary hover:bg-surface-tertiary',
              // Literal strings required — Tailwind purges classes built via template literals
              isTabletExpanded ? 'flex' : 'flex md:hidden lg:flex',
            ].join(' ')}
          >
            <span
              aria-hidden="true"
              className={[
                'w-1.5 h-1.5 rounded-full shrink-0',
                isTestMode ? 'bg-feedback-warning-main' : 'bg-feedback-success-main',
              ].join(' ')}
            />
            {isTestMode ? 'Test' : 'Live'}
          </button>
        )}
      </div>

      {/* ── Navigation ──────────────────────────────────────────────────────── */}
      <nav aria-label="Main navigation" className="flex-1 px-3 overflow-y-auto">
        {[
          { id: 'business', label: 'Business', items: NAV_MAIN },
          { id: 'developer', label: 'Developer', items: NAV_DEVELOPER },
          { id: 'admin', label: 'Admin', items: NAV_ADMIN },
        ].map(({ id, label, items }, sectionIdx) => {
          // While pending, the nav shows only the pages a merchant can actually
          // reach — no wall of disabled rows. A section with nothing reachable
          // (e.g. Developer) drops out entirely, header and all. Approved
          // accounts see every item.
          const visibleItems = isReadOnly
            ? items.filter((item) => PENDING_REACHABLE_PATHS.has(item.to))
            : items
          if (visibleItems.length === 0) return null
          return (
            <div key={id} className={sectionIdx < 2 ? 'mb-4' : ''}>
              {/* Section label — mobile + desktop + tablet-expanded */}
              <div
                id={`nav-group-${id}`}
                className={`px-3 mb-1.5 text-[10px] font-semibold uppercase tracking-widest text-content-tertiary ${showOnMobileAndDesktop()}`}
              >
                {label}
              </div>
              {/* Visual divider — tablet icon-only only, replaces section label */}
              <div
                className={`mx-2 mb-1.5 h-px bg-border-primary-light ${showOnTabletOnly('block')}`}
                aria-hidden="true"
              />
              <ul aria-labelledby={`nav-group-${id}`} className="space-y-0.5">
                {visibleItems.map((item) => (
                  <li key={item.to}>
                    <NavItem {...item} />
                  </li>
                ))}
              </ul>
            </div>
          )
        })}
      </nav>

      {/* ── Tablet expand/collapse button ───────────────────────────────────── */}
      {/* Only on tablet (hidden md:flex lg:hidden). h-11 = 44px touch target. */}
      <button
        onClick={toggleTabletExpanded}
        className="hidden md:flex lg:hidden h-11 shrink-0 border-t border-border-primary-light items-center justify-center text-content-tertiary hover:text-content-primary transition-colors cursor-pointer w-full"
        aria-label={isTabletExpanded ? 'Collapse navigation' : 'Expand navigation'}
      >
        {isTabletExpanded
          ? <ChevronLeft size={16} strokeWidth={1.75} />
          : <ChevronRight size={16} strokeWidth={1.75} />
        }
      </button>

      {/* ── Merchant identity + account menu ────────────────────────────────── */}
      {/* The whole identity row is the dropdown trigger; clicking anywhere on it
          opens the account menu to the side (side="right"), whose only item is Log out.
          NOTE: Pax's DropdownMenuTrigger renders its OWN <button> and spreads props
          onto it — it does NOT support asChild. So we style the trigger directly
          (className + children land on Pax's button). Wrapping our own <button> in
          asChild would nest a button-in-button and the row would size to content. */}
      <div className="border-t border-border-primary-light shrink-0">
        <DropdownMenu>
          <DropdownMenuTrigger
            aria-label="Account menu"
            className="w-full flex items-center gap-3 px-5 py-4 text-left hover:bg-surface-secondary transition-colors cursor-pointer"
          >
            {/* Avatar initials — always shown (the only visible part on the
                56px tablet rail, where it's still clickable) */}
            <div className="w-8 h-8 rounded-full bg-action-primary-main flex items-center justify-center text-content-inverse text-xs font-semibold shrink-0">
              AC
            </div>
            {/* Name + email — mobile + desktop + tablet-expanded */}
            <div className={`min-w-0 flex-1 ${showOnMobileAndDesktop()}`}>
              <div className="text-sm font-medium text-content-primary truncate">
                Acme Corp
              </div>
              <div className="text-xs text-content-tertiary truncate">
                treasury@acme.com
              </div>
            </div>
            {/* Affordance cue — signals the row is interactive. Hidden on the
                collapsed tablet rail (shares the name/email visibility). */}
            <ChevronsUpDown
              width={15}
              height={15}
              strokeWidth={1.75}
              className={`shrink-0 text-content-tertiary ${showOnMobileAndDesktop()}`}
            />
          </DropdownMenuTrigger>
          {/* Account menu opening to the side (side="right"), floating beside the
              identity row. Single Log out CTA. Pax's content supplies the soft card
              (rounded-lg + shadow-elevate + hairline border); the p-1.5 gutter insets
              the row so its hover reads as a soft, rounded full-width highlight.
              align="center" centers the card on the row; sideOffset is the gap off the
              sidebar's right edge; collisionPadding keeps it off the viewport edges and
              lets Radix flip it leftward if the right has no room (e.g. mobile drawer). */}
          <DropdownMenuContent
            side="right"
            align="center"
            sideOffset={8}
            collisionPadding={8}
            className="min-w-[208px] p-1.5"
          >
            <DropdownMenuItem
              onClick={handleLogout}
              className="cursor-pointer gap-2.5 rounded-md px-3 py-3 text-content-primary"
            >
              <LogOut width={16} height={16} strokeWidth={1.75} />
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </aside>
  )
}
