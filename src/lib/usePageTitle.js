import { useEffect } from 'react'

// usePageTitle — sets document.title on mount, resets to the base title on unmount.
//
// Why this matters (WCAG 2.4.2 Page Titled, Level A):
//   When a screen reader user navigates between pages, the browser announces the
//   new page title. Without unique titles, every page announces "GlobalStack" —
//   users can't tell which page just loaded.
//
// The format "Page — GlobalStack" follows convention: specific page name first
// (most useful info), then the product name. This matches what users see in
// browser tabs and history as well.
export function usePageTitle(pageTitle) {
  useEffect(() => {
    const prev = document.title
    document.title = `${pageTitle} — GlobalStack`
    return () => {
      document.title = prev
    }
  }, [pageTitle])
}
