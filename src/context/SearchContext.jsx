// SearchContext — global command palette / search state.
//
// Why context here:
// The search overlay renders in AppShell (above everything), but the floating
// pill trigger is also in AppShell. Pages need to be able to call addRecentItem()
// whenever a detail panel is opened — that's the session history mechanism.
//
// Recent items are session-only (React state, not localStorage). They track the
// last 5 records the operator actually opened, so the initial search state shows
// useful context rather than a blank bar.
//
// Recent items format:
//   { type: 'transaction'|'account'|'customer'|'recipient', id }
//
// Pages call addRecentItem(type, id) — GlobalSearch looks up the display data
// from fixtures at render time. Keeps pages' click handlers simple, and
// centralises all display logic in GlobalSearch.
//
// addRecentItem() deduplicates by id and caps the list at 5.

import { createContext, useContext, useState, useCallback } from 'react'

const SearchContext = createContext(null)

export function SearchProvider({ children }) {
  const [isOpen, setIsOpen] = useState(false)
  const [recentItems, setRecentItems] = useState([])

  const openSearch = useCallback(() => setIsOpen(true), [])
  const closeSearch = useCallback(() => setIsOpen(false), [])

  // Called by any page that opens a detail panel.
  // addRecentItem(type, id) — display data is looked up in GlobalSearch from fixtures.
  const addRecentItem = useCallback((type, id) => {
    setRecentItems((prev) => {
      // Deduplicate by id — same record opened twice stays at top, not duplicated
      const without = prev.filter((r) => r.id !== id)
      return [{ type, id }, ...without].slice(0, 5)
    })
  }, [])

  return (
    <SearchContext.Provider value={{ isOpen, openSearch, closeSearch, recentItems, addRecentItem }}>
      {children}
    </SearchContext.Provider>
  )
}

export function useSearch() {
  const ctx = useContext(SearchContext)
  if (!ctx) throw new Error('useSearch must be used within SearchProvider')
  return ctx
}
