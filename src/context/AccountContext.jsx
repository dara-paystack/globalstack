import { createContext, useContext, useEffect, useState } from 'react'

// AccountContext — the merchant's onboarding/account status.
//
// This is the spine of the signup feature. Three screens write to it
// (signup form → register(), Sumsub handoff → setStatus('pending')) and
// the dashboard reads from it to decide which of three states to render:
//   approved → full dashboard (the existing experience)
//   pending  → read-only, empty data, "under review" banner
//   rejected → dedicated full-page rejected state
//
// WHY A CONTEXT (and not props): status has to be readable from the
// landing CTAs, the standalone signup routes, AppShell's gating logic,
// the Sidebar demo switcher, AND every data hook. Threading that through
// props would be unworkable — this is exactly the cross-cutting concern
// React Context exists for. Same reasoning as ModeContext.
//
// WHY localStorage (unlike ModeContext, which is in-memory): signup state
// must survive a full page reload — the user leaves for the Sumsub flow
// and comes back, and a stakeholder demo shouldn't reset on refresh.

const STORAGE_KEY = 'globalstack.account'

// Valid statuses. Default is 'approved' so that anyone arriving via the
// existing "Sign in" CTA (→ /dashboard) sees the dashboard exactly as it
// works today. Only going through /signup moves you to 'pending'.
const DEFAULT_STATE = { status: 'approved', company: null, email: null }

const AccountContext = createContext({
  ...DEFAULT_STATE,
  isReadOnly: false,
  isRejected: false,
  setStatus: () => {},
  register: () => {},
  reset: () => {},
})

// Read persisted state once. Wrapped in try/catch because localStorage can
// throw (private browsing, disabled storage) — we degrade to defaults
// rather than crash the app over a persistence convenience.
function readPersisted() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return DEFAULT_STATE
    const parsed = JSON.parse(raw)
    // Guard against malformed/old data shapes.
    if (!parsed || typeof parsed.status !== 'string') return DEFAULT_STATE
    return { ...DEFAULT_STATE, ...parsed }
  } catch {
    return DEFAULT_STATE
  }
}

export function AccountProvider({ children }) {
  // Function initializer → readPersisted() runs once on mount, not every render.
  const [state, setState] = useState(readPersisted)

  // Persist on every change. Kept in an effect (not inline in setters) so
  // there's a single write path no matter how state was updated.
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    } catch {
      // Storage unavailable — feature still works for the session, just won't persist.
    }
  }, [state])

  // setStatus — used by the Sumsub handoff and the demo switcher.
  const setStatus = (status) => setState((prev) => ({ ...prev, status }))

  // register — called when the signup form is submitted. Captures who they
  // are, but does NOT flip status yet (they're still pre-verification).
  const register = ({ company, email }) =>
    setState((prev) => ({ ...prev, company, email }))

  // reset — returns to defaults so the signup flow can be re-run in a demo.
  const reset = () => setState(DEFAULT_STATE)

  return (
    <AccountContext.Provider
      value={{
        ...state,
        isReadOnly: state.status === 'pending',
        isRejected: state.status === 'rejected',
        setStatus,
        register,
        reset,
      }}
    >
      {children}
    </AccountContext.Provider>
  )
}

export function useAccount() {
  return useContext(AccountContext)
}
