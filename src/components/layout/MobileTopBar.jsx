// MobileTopBar — persistent top bar visible only on mobile (hidden on md+).
//
// WHY A TOP BAR INSTEAD OF A PERSISTENT HAMBURGER IN THE CORNER:
// A bare hamburger icon floating in the top-left of the content area is
// ambiguous — it could be a page-level action, not navigation. A full top bar
// gives it structural context: "this is the navigation chrome." It also provides
// a home for the search icon on mobile, where cmd+k is meaningless (no keyboard).
// The bar uses the same background as the sidebar header so it feels like a
// continuous navigation environment — the sidebar, when it slides in, is the
// same visual space as this bar.
//
// HEIGHT: 48px (h-12). Enough for touch targets, minimal enough that it doesn't
// eat into content space on small screens.

import { Menu, Search } from 'lucide-react'
import { useSidebar } from '../../context/SidebarContext'
import { useSearch } from '../../context/SearchContext'

export function MobileTopBar() {
  const { openMobileSidebar } = useSidebar()
  const { openSearch } = useSearch()

  return (
    // md:hidden — only rendered on mobile. Tailwind purges the DOM node on tablet+.
    <div className="md:hidden h-12 bg-[var(--midnight-100)] border-b border-border-primary-light flex items-center px-2 shrink-0 z-10">
      {/* Hamburger — 44×44px touch target via w-11 h-11 */}
      <button
        onClick={openMobileSidebar}
        className="w-11 h-11 flex items-center justify-center text-content-tertiary hover:text-content-primary transition-colors cursor-pointer rounded-lg"
        aria-label="Open navigation menu"
        aria-haspopup="true"
      >
        <Menu size={18} strokeWidth={1.75} />
      </button>

      {/* Wordmark — centered */}
      <div className="flex-1 flex items-center justify-center">
        <img
          src="/globalstack-logo.svg"
          alt="GlobalStack"
          className="h-4 w-auto"
        />
      </div>

      {/* Search icon — opens cmd+k search overlay.
          On mobile, the floating pill trigger is hidden, so this is the
          only way to open search. Same openSearch() call as cmd+k. */}
      <button
        onClick={openSearch}
        className="w-11 h-11 flex items-center justify-center text-content-tertiary hover:text-content-primary transition-colors cursor-pointer rounded-lg"
        aria-label="Open search"
      >
        <Search size={18} strokeWidth={1.75} />
      </button>
    </div>
  )
}
