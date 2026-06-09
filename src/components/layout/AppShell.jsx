// AppShell — layout root. Sidebar + content area + GlobalPanel.
//
// RESPONSIVE LAYOUT MODEL:
//
// Desktop (lg: 1024px+):
//   Sidebar fixed 224px left, always visible.
//   Content area: ml-56 (224px offset). GlobalPanel pushes from right (420px).
//
// Tablet (md: 768px–1023px):
//   Sidebar fixed 56px left (icon-only rail), always visible.
//   Content area: md:ml-14 (56px offset). GlobalPanel pushes from right (380px).
//   Sidebar can expand to 224px via toggle — it overlays content (no push).
//   isTabletExpanded backdrop covers content; clicking it collapses the sidebar.
//
// Mobile (< md):
//   Sidebar hidden by default (translateX(-100%)).
//   MobileTopBar (48px) appears at top of content area.
//   Hamburger in MobileTopBar slides sidebar in (translateX(0)).
//   Content area gets margin-left: 280px when sidebar opens (same push mechanism
//   as the detail panel — both siblings shift via the same flex/margin system).
//   A semi-transparent backdrop appears at z-20 (below sidebar z-30, above content).
//
// MUTUAL EXCLUSION (mobile only):
//   openPanel() → closeMobileSidebar() (via useEffect on panelState).
//   openMobileSidebar() → closePanel() (called directly in Sidebar).
//   Reason: on mobile, the detail panel is 100vw — it occupies the entire screen.
//   If the sidebar were also open, the content would be displaced 280px + 100vw,
//   creating an incoherent layout. Two full-screen interactions can't coexist.
//
// PANEL PUSH MECHANISM:
//   GlobalPanel is a flex sibling of <main>. When its width changes (0 → 380/420px),
//   <main> physically reflows narrower. This is why overflow-hidden is on the flex
//   container: it clips the panel's content during animation, not the panel boundary.
//
// MOBILE SIDEBAR PUSH:
//   The content wrapper uses margin-left to push right when sidebar is open.
//   This is different from the panel push (which uses width). Why?
//   The panel is a flex sibling — widths are the natural flex unit.
//   The content wrapper is the flex CONTAINER — margin is the natural offset unit
//   for a fixed-width sibling (the sidebar) outside the flex context.
//   Both animate at 220ms ease-out so they move together.

import { useEffect } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { Alert, AlertDescription, AlertWarningIcon, AlertInformationIcon, TooltipProvider } from '@paystack/pax'
import { Sidebar } from './Sidebar'
import { GlobalPanel } from './GlobalPanel'
import { GlobalSearch } from '../ui/GlobalSearch'
import { MobileTopBar } from './MobileTopBar'
import { DemoStatusSwitcher } from './DemoStatusSwitcher'
import { usePanelContext } from '../../context/PanelContext'
import { useMode } from '../../context/ModeContext'
import { useAccount } from '../../context/AccountContext'
import { useSidebar } from '../../context/SidebarContext'
import RejectedState from '../../pages/signup/RejectedState'

export function AppShell() {
  const { closePanel, panelState } = usePanelContext()
  const { isMobileOpen, isTabletExpanded, closeMobileSidebar, closeTabletExpanded } = useSidebar()
  const location = useLocation()
  const { isTestMode } = useMode()
  // Pending (in-review) accounts get a persistent "under review" banner and a
  // read-only dashboard (data hooks short-circuit to empty; actions disable).
  // Rejected accounts get NO dashboard at all — see the early return below.
  const { isReadOnly, isRejected } = useAccount()

  // Close detail panel and sidebar on route change.
  useEffect(() => {
    closePanel()
    closeMobileSidebar()
    closeTabletExpanded()
  }, [location.pathname]) // eslint-disable-line react-hooks/exhaustive-deps

  // Mutual exclusion (mobile): close sidebar when detail panel opens.
  // This fires whenever the panel type+id changes to a non-null state.
  useEffect(() => {
    if (panelState.type && panelState.id) {
      closeMobileSidebar()
    }
  }, [panelState.type, panelState.id]) // eslint-disable-line react-hooks/exhaustive-deps

  // Rejected accounts never reach the dashboard chrome. We gate here (after all
  // hooks have run, so the rules of hooks hold) and render the full-page rejected
  // screen instead of the Sidebar/main/panel layout.
  if (isRejected) {
    // DemoStatusSwitcher rides alongside the rejected screen so you can flip back
    // out of it — the sidebar (its sibling in the normal branch) isn't rendered here.
    return (
      <>
        <RejectedState />
        <DemoStatusSwitcher />
      </>
    )
  }

  return (
    // Single Radix TooltipProvider for the whole dashboard — every Pax Tooltip
    // (e.g. disabled read-only actions in PageHeader/Overview) needs a provider
    // ancestor. delayDuration trims the default 700ms to feel responsive.
    <TooltipProvider delayDuration={200}>
    <div className="min-h-screen bg-surface-secondary">
      {/* Skip navigation — WCAG 2.4.1 Bypass Blocks (Level A). */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:px-4 focus:py-2 focus:bg-action-primary-main focus:text-content-inverse focus:rounded-lg focus:text-sm focus:font-medium focus:shadow-lg"
      >
        Skip to main content
      </a>

      {/* Sidebar — fixed, z-30 (above backdrops at z-20) */}
      <Sidebar />

      {/* Mobile backdrop — visible only on mobile when sidebar is open.
          z-20 puts it above content (z-0) but below sidebar (z-30).
          Clicking closes the sidebar and returns content to its resting position. */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/30 md:hidden"
          onClick={closeMobileSidebar}
          aria-hidden="true"
        />
      )}

      {/* Tablet expanded backdrop — visible only on tablet when sidebar is expanded.
          Tablet sidebar expansion is overlay (no push), so this prevents
          interaction with the content behind the expanded sidebar. */}
      {isTabletExpanded && (
        <div
          className="fixed inset-0 z-20 bg-black/30 hidden md:block lg:hidden"
          onClick={closeTabletExpanded}
          aria-hidden="true"
        />
      )}

      {/* GlobalSearch renders its own fixed-position overlay + floating pill.
          z-[60] puts it above GlobalPanel and all backdrops. */}
      <GlobalSearch />

      {/* Content area wrapper.
          Mobile: ml-0 resting, ml-[280px] when sidebar open (push).
          Tablet: md:ml-14 (56px icon sidebar).
          Desktop: lg:ml-56 (224px full sidebar).
          transition-[margin-left] animates the sidebar push at the same
          speed as the sidebar translateX (220ms ease-out). */}
      <div
        className={[
          isMobileOpen ? 'ml-[280px]' : 'ml-0',
          'md:ml-14 lg:ml-56',
          'flex flex-col h-screen overflow-hidden bg-surface-primary',
          'transition-[margin-left] duration-[220ms] ease-out',
        ].join(' ')}
      >
        {/* Mobile top bar — hamburger + wordmark + search icon.
            Only visible on mobile (md:hidden inside MobileTopBar). */}
        <MobileTopBar />

        {/* Main content row — flex siblings so GlobalPanel pushes <main>. */}
        <div className="flex flex-1 min-h-0 overflow-hidden">
          <main id="main-content" className="flex-1 min-w-0 overflow-y-auto">
            {/* Test mode banner — edge-to-edge, before the padded content block. */}
            {isTestMode && (
              <Alert severity="warning" variant="filled" className="rounded-none border-x-0 border-t-0">
                <AlertWarningIcon />
                <AlertDescription>
                  You&apos;re viewing test data. No real transactions will be affected.
                </AlertDescription>
              </Alert>
            )}
            {/* Account-under-review banner — shown while the merchant is pending
                verification. The dashboard renders read-only (empty data, disabled
                actions) so they can look around while we review their business. */}
            {isReadOnly && (
              <Alert severity="information" variant="filled" className="rounded-none border-x-0 border-t-0">
                <AlertInformationIcon />
                <AlertDescription>
                  Your account is under review. You have read-only access until your business is verified — we&apos;ll email you when it&apos;s ready.
                </AlertDescription>
              </Alert>
            )}
            {/* Content padding:
                Mobile:  p-4  (16px) — tight, full viewport width in use
                Tablet:  p-6  (24px) — more breathing room
                Desktop: p-16 (64px) — generous, matches original design */}
            <div className="p-4 md:p-6 lg:p-16">
              <div className="max-w-[1200px] mx-auto">
                <Outlet />
              </div>
            </div>
          </main>
          <GlobalPanel />
        </div>
      </div>
      {/* Prototype-only: flip account status (approved/pending/rejected) live. */}
      <DemoStatusSwitcher />
    </div>
    </TooltipProvider>
  )
}
