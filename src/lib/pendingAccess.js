// Pending (under-review) account access — single source of truth.
//
// When a merchant is pending verification, the dashboard runs as a "restricted
// shell": a dedicated status home plus a short list of genuinely useful pages
// (sandbox API keys, team invites). Everything else is locked until approval.
//
// Two places need to agree on exactly which paths stay reachable:
//   - AppShell  — gates routing (renders the status home / redirects blocked paths)
//   - Sidebar   — renders lock cues on the nav items that aren't reachable
// Keeping the set here means adding a reachable page is a one-line change that
// both consumers pick up — they can never drift out of sync.

export const PENDING_REACHABLE_PATHS = new Set([
  '/dashboard',                    // the under-review status home itself
  '/dashboard/settings/api-key',   // sandbox keys — start building while you wait
  '/dashboard/settings/team',      // invite teammates ahead of approval
])

// Docs lives off-product, so it's always reachable (never locked) and opens in a
// new tab. Stub URL for the prototype — point this at real docs when they exist.
export const DOCS_URL = 'https://docs.globalstack.com'
