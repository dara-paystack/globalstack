import { useEffect } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { TopBar } from './TopBar'
import { GlobalPanel } from './GlobalPanel'
import { usePanelContext } from '../../context/PanelContext'

// AppShell is the layout route wrapper.
// It renders Sidebar + TopBar once, then a flex row with:
//   - <main> (flex-1, scrollable) — fills available width
//   - <GlobalPanel> — fixed 420px, animates in from right
//
// The flex row is what enables the push layout: GlobalPanel is a real flex
// sibling of <main>, so when it opens, <main> physically reflows narrower.
// No overlay, no backdrop — the table and all page content stay visible.
//
// Route changes close the panel via useEffect on location.pathname.
export function AppShell() {
  const { closePanel } = usePanelContext()
  const location = useLocation()

  // Close the panel when the user navigates to a different page.
  // Dependency array intentionally excludes closePanel (stable ref from useState setter).
  useEffect(() => {
    closePanel()
  }, [location.pathname]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="min-h-screen bg-surface-secondary">
      <Sidebar />
      <div className="ml-56 flex flex-col h-screen bg-surface-primary">
        <TopBar />
        {/* flex-1 overflow-hidden: this row fills remaining vertical space.
            overflow-hidden clips the panel during its width animation. */}
        <div className="flex flex-1 overflow-hidden">
          {/* main scrolls independently — panel doesn't scroll with it */}
          <main className="flex-1 min-w-0 overflow-y-auto p-8">
            <div className="max-w-[1200px] mx-auto">
              <Outlet />
            </div>
          </main>
          <GlobalPanel />
        </div>
      </div>
    </div>
  )
}
