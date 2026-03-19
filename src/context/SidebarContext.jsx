// SidebarContext — manages sidebar visibility across breakpoints.
//
// Three sidebar states by breakpoint:
//   Mobile  (< 768px): hidden by default, opened by hamburger in MobileTopBar.
//                      isMobileOpen tracks this. Content area shifts right 280px
//                      via margin-left when open (push, not overlay).
//   Tablet  (768–1023px): always-visible icon rail (56px). isTabletExpanded
//                      tracks whether it's been manually expanded to full width.
//                      Expanded state = overlay on top of content (no push).
//   Desktop (1024px+): always visible, full 224px. No state needed.
//
// Mutual exclusion (mobile only):
//   AppShell closes the mobile sidebar whenever a detail panel opens.
//   openMobileSidebar() is passed closePanel() from AppShell so that
//   opening the sidebar closes the detail panel first.
//
// Why context instead of local state in AppShell?
//   Sidebar.jsx needs isMobileOpen/isTabletExpanded to set translateX and width.
//   MobileTopBar.jsx needs openMobileSidebar.
//   Both are siblings of AppShell's children — passing via context avoids
//   prop-drilling through Outlet (which renders page components, not sidebar).

import { createContext, useContext, useState } from 'react'

const SidebarContext = createContext(null)

export function SidebarProvider({ children }) {
  const [isMobileOpen, setIsMobileOpen] = useState(false)
  const [isTabletExpanded, setIsTabletExpanded] = useState(false)

  function openMobileSidebar() { setIsMobileOpen(true) }
  function closeMobileSidebar() { setIsMobileOpen(false) }
  function toggleTabletExpanded() { setIsTabletExpanded((v) => !v) }
  function closeTabletExpanded() { setIsTabletExpanded(false) }

  return (
    <SidebarContext.Provider value={{
      isMobileOpen,
      isTabletExpanded,
      openMobileSidebar,
      closeMobileSidebar,
      toggleTabletExpanded,
      closeTabletExpanded,
    }}>
      {children}
    </SidebarContext.Provider>
  )
}

export function useSidebar() {
  const ctx = useContext(SidebarContext)
  if (!ctx) throw new Error('useSidebar must be used within SidebarProvider')
  return ctx
}
