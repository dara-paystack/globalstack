import { useEffect } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { GlobalPanel } from './GlobalPanel'
import { usePanelContext } from '../../context/PanelContext'
import { useMode } from '../../context/ModeContext'

// AppShell is the layout route wrapper.
// It renders Sidebar once, then a flex row with:
//   - <main> (flex-1, scrollable) — fills available width
//   - <GlobalPanel> — fixed 420px, animates in from right
//
// The flex row is what enables the push layout: GlobalPanel is a real flex
// sibling of <main>, so when it opens, <main> physically reflows narrower.
// No overlay, no backdrop — the table and all page content stay visible.
//
// Route changes close the panel via useEffect on location.pathname.
//
// The TopBar has been removed. The Live/Test mode indicator now lives in the
// Sidebar header row alongside the wordmark. The test mode amber banner renders
// at the top of <main> — inside the content area where it belongs contextually,
// not as chrome above it.
export function AppShell() {
  const { closePanel } = usePanelContext()
  const location = useLocation()
  const { isTestMode } = useMode()

  // Close the panel when the user navigates to a different page.
  // Dependency array intentionally excludes closePanel (stable ref from useState setter).
  useEffect(() => {
    closePanel()
  }, [location.pathname]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="min-h-screen bg-surface-secondary">
      {/* Skip navigation link — WCAG 2.4.1 Bypass Blocks (Level A).
          Visually hidden until focused so it doesn't clutter the layout for
          sighted users. When a keyboard user presses Tab as their first action,
          this link receives focus and they can press Enter to skip the 8-link
          sidebar and land directly in <main>.
          focus:not-sr-only + focus:clip-auto restores visibility on focus. */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:px-4 focus:py-2 focus:bg-action-primary-main focus:text-content-inverse focus:rounded-lg focus:text-sm focus:font-medium focus:shadow-lg"
      >
        Skip to main content
      </a>

      <Sidebar />
      {/* overflow-hidden clips the panel during its width animation. */}
      <div className="ml-56 flex h-screen overflow-hidden bg-surface-primary">
        {/* id="main-content" is the skip link target */}
        <main id="main-content" className="flex-1 min-w-0 overflow-y-auto">
          {/* Test mode banner — full-width at the top of the content area.
              Renders before the padded content block so it spans edge-to-edge. */}
          {isTestMode && (
            <div className="bg-feedback-warning-light border-b border-feedback-warning-border px-8 py-2 text-sm text-feedback-warning-dark">
              You&apos;re viewing test data. No real transactions will be affected.
            </div>
          )}
          <div className="p-16">
            <div className="max-w-[1200px] mx-auto">
              <Outlet />
            </div>
          </div>
        </main>
        <GlobalPanel />
      </div>
    </div>
  )
}
