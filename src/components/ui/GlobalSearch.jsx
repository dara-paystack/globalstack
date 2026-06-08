// GlobalSearch — bottom-anchored command palette.
//
// WHY BOTTOM-ANCHORED:
// Spotlight-style center-screen works for OS-level launchers that float in
// abstract space. Here we're searching *this app's* data — grounding the
// search at the bottom keeps it spatially connected to the interface it
// queries. Results grow upward toward the page content, which is the
// right spatial metaphor: query at the bottom, answers rising toward context.
//
// KEYBOARD SHORTCUT STRATEGY:
// Global keydown on window catches cmd+k from anywhere. The guard checks
// document.activeElement — if a non-search text input is focused (form
// fields, existing search bars), we skip the shortcut so users can type
// normally. Our own search input is exempt: cmd+k while searching closes
// the palette cleanly.
//
// ANIMATION SEQUENCING:
// Gradient fades in at 150ms, bar slides up 30ms later (via transition-delay).
// This two-beat sequence communicates "environment shifts first, then the
// tool arrives" — the light changes before the instrument appears. It reduces
// visual complexity vs. everything moving simultaneously.
//
// RECENT ITEMS:
// Session-only React state via SearchContext. Updated whenever a detail panel
// is opened anywhere in the app (pages call addRecentItem on panel open).
// No localStorage — refreshing the page clears history intentionally. The
// operator's session context is what matters, not a persistent log.
//
// SEARCH:
// Client-side against fixture imports — no MSW calls. Results are grouped
// by entity type, capped at 3 per group, sorted by match quality (exact ID
// match → name prefix → substring). The panel opens via router state on select.

import { useEffect, useRef, useState, useMemo, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, Clock } from 'lucide-react'
import { useSearch } from '../../context/SearchContext'
import { transactions } from '../../mocks/fixtures/transactions'
import { accounts } from '../../mocks/fixtures/accounts'
import { customers } from '../../mocks/fixtures/customers'
import { recipients } from '../../mocks/fixtures/recipients'
import { formatAmount } from '../../lib/format'

// KYC labels duplicated here (not exported from Badge.jsx).
// This avoids importing Badge internals — if the label set diverges,
// this one only needs to cover the display strings, not the color logic.
const KYC_DISPLAY = {
  not_started: 'Not started',
  incomplete: 'Incomplete',
  awaiting_questionnaire: 'Awaiting questionnaire',
  awaiting_ubo: 'Awaiting UBO',
  under_review: 'Under review',
  active: 'Approved',
  rejected: 'Rejected',
  paused: 'Paused',
  offboarded: 'Offboarded',
}

function capitalize(str) {
  if (!str) return ''
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase()
}

function formatRail(rail) {
  if (!rail) return ''
  return rail
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
}

// Score a single field against the query.
// 3 = exact match, 2 = starts with, 1 = substring, 0 = no match
function scoreField(str, q) {
  if (!str) return 0
  const s = String(str).toLowerCase()
  if (s === q) return 3
  if (s.startsWith(q)) return 2
  if (s.includes(q)) return 1
  return 0
}

function bestScore(fields, q) {
  return Math.max(0, ...fields.map((f) => scoreField(f, q)))
}

// ── Search functions — one per entity type ─────────────────────────────────

function searchTransactions(q) {
  const scored = transactions
    .map((tx) => ({
      tx,
      score: bestScore(
        [tx.id, tx.merchant_reference, String(tx.destAmount), tx.corridor, tx.sourceMethod, tx.destination],
        q,
      ),
    }))
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score)

  return {
    total: scored.length,
    results: scored.slice(0, 3).map(({ tx }) => ({
      entityType: 'Transaction',
      navigateType: 'transaction',
      id: tx.id,
      label: tx.id,
      subtitle: `${tx.corridor} · ${formatAmount(tx.destAmount, tx.destCurrency)}`,
      value: capitalize(tx.status),
      navPath: '/dashboard/transactions',
      navState: { openTransactionId: tx.id },
    })),
  }
}

function searchCustomers(q) {
  const scored = customers
    .map((c) => ({
      c,
      score: bestScore([c.id, c.name, c.email], q),
    }))
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score)

  return {
    total: scored.length,
    results: scored.slice(0, 3).map(({ c }) => ({
      entityType: 'Customer',
      navigateType: 'customer',
      id: c.id,
      label: c.name,
      subtitle: c.id,
      value: KYC_DISPLAY[c.kycStatus] ?? capitalize(c.kycStatus),
      navPath: '/dashboard/customers',
      navState: { openCustomerId: c.id },
    })),
  }
}

function searchAccounts(q) {
  const scored = accounts
    .map((a) => ({
      a,
      score: bestScore([a.id, a.label, a.address, a.addressShort, a.accountNumber, a.customer], q),
    }))
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score)

  return {
    total: scored.length,
    results: scored.slice(0, 3).map(({ a }) => ({
      entityType: 'Account',
      navigateType: 'account',
      id: a.id,
      label: a.label + (a.customer ? ` — ${a.customer}` : ''),
      subtitle:
        a.type === 'on-chain'
          ? `${a.addressShort} · ${capitalize(a.chain ?? '')}`
          : `${a.addressShort} · ${a.bankName ?? 'Fiat'}`,
      value: formatAmount(a.balance, a.currency),
      navPath: '/dashboard/accounts',
      navState: { openAccountId: a.id },
    })),
  }
}

function searchRecipients(q) {
  const scored = recipients
    .map((r) => ({
      r,
      score: bestScore([r.id, r.name, r.accountOwnerName, r.walletAddress, r.bankName, r.accountNumber], q),
    }))
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score)

  return {
    total: scored.length,
    results: scored.slice(0, 3).map(({ r }) => ({
      entityType: 'Recipient',
      navigateType: 'recipient',
      id: r.id,
      label: r.name,
      subtitle:
        r.type === 'fiat'
          ? `${r.accountNumberMasked} · ${formatRail(r.rail)}`
          : `${(r.walletAddress ?? '').slice(0, 10)}… · ${capitalize(r.chain ?? '')}`,
      value: capitalize(r.status),
      navPath: '/dashboard/recipients',
      navState: { openRecipientId: r.id },
    })),
  }
}

// Build a full result object from { type, id } by looking up the fixture record.
// Used for recent items — pages only store type + id; display data is derived here.
// Returns null if the record no longer exists in the fixture (shouldn't happen in
// a prototype with static fixtures, but guards against stale state).
function lookupRecentResult(type, id) {
  switch (type) {
    case 'transaction': {
      const tx = transactions.find((t) => t.id === id)
      if (!tx) return null
      return {
        entityType: 'Transaction',
        navigateType: 'transaction',
        id: tx.id,
        label: tx.id,
        subtitle: `${tx.corridor} · ${formatAmount(tx.destAmount, tx.destCurrency)}`,
        value: capitalize(tx.status),
        navPath: '/dashboard/transactions',
        navState: { openTransactionId: tx.id },
      }
    }
    case 'customer': {
      const c = customers.find((cu) => cu.id === id)
      if (!c) return null
      return {
        entityType: 'Customer',
        navigateType: 'customer',
        id: c.id,
        label: c.name,
        subtitle: c.id,
        value: KYC_DISPLAY[c.kycStatus] ?? capitalize(c.kycStatus),
        navPath: '/dashboard/customers',
        navState: { openCustomerId: c.id },
      }
    }
    case 'account': {
      const a = accounts.find((ac) => ac.id === id)
      if (!a) return null
      return {
        entityType: 'Account',
        navigateType: 'account',
        id: a.id,
        label: a.label + (a.customer ? ` — ${a.customer}` : ''),
        subtitle:
          a.type === 'on-chain'
            ? `${a.addressShort} · ${capitalize(a.chain ?? '')}`
            : `${a.addressShort} · ${a.bankName ?? 'Fiat'}`,
        value: formatAmount(a.balance, a.currency),
        navPath: '/dashboard/accounts',
        navState: { openAccountId: a.id },
      }
    }
    case 'recipient': {
      const r = recipients.find((rc) => rc.id === id)
      if (!r) return null
      return {
        entityType: 'Recipient',
        navigateType: 'recipient',
        id: r.id,
        label: r.name,
        subtitle:
          r.type === 'fiat'
            ? `${r.accountNumberMasked} · ${formatRail(r.rail)}`
            : `${(r.walletAddress ?? '').slice(0, 10)}… · ${capitalize(r.chain ?? '')}`,
        value: capitalize(r.status),
        navPath: '/dashboard/recipients',
        navState: { openRecipientId: r.id },
      }
    }
    default:
      return null
  }
}

// ── Keyboard key badge — mimics a physical key cap ────────────────────────
function Key({ children }) {
  return (
    <kbd className="inline-flex items-center justify-center px-1.5 py-1 rounded-md bg-surface-secondary border border-border-primary-main border-b-2 text-[11px] font-medium text-content-secondary leading-none flex-shrink-0">
      {children}
    </kbd>
  )
}

// ── Entity type pill — neutral chip look in plain HTML ─────────────────────
// Not using Pax Chip here because Chip internals are hard to override to
// match the compact size needed in a result row without fighting CVA specificity.
// A simple inline pill is clearer and doesn't leak into the design system.
function TypePill({ label }) {
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-surface-secondary border border-border-primary-main text-content-tertiary flex-shrink-0">
      {label}
    </span>
  )
}

// ── Individual result row ──────────────────────────────────────────────────
function ResultRow({ result, isFocused, onClick, onMouseEnter }) {
  return (
    <button
      type="button"
      className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors duration-75 cursor-pointer ${
        isFocused ? 'bg-surface-secondary' : 'hover:bg-surface-secondary'
      }`}
      onClick={onClick}
      onMouseEnter={onMouseEnter}
    >
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-content-primary truncate">{result.label}</p>
        <p className="text-xs text-content-tertiary truncate">{result.subtitle}</p>
      </div>
      <span className="text-xs text-content-tertiary flex-shrink-0 ml-2">{result.value}</span>
    </button>
  )
}

// ── Group header inside results card ──────────────────────────────────────
function GroupHeader({ label, isFirst, seeAllCount, onSeeAll }) {
  return (
    <div
      className={`px-4 py-3 flex items-center justify-between text-xs font-semibold uppercase tracking-widest text-content-tertiary ${
        !isFirst ? 'border-t border-border-primary-light' : ''
      }`}
    >
      {label}
      {seeAllCount > 0 && (
        <button
          type="button"
          className="normal-case tracking-normal font-medium text-content-tertiary hover:text-content-secondary transition-colors cursor-pointer"
          onClick={onSeeAll}
        >
          See all {seeAllCount} →
        </button>
      )}
    </div>
  )
}

// ── Main component ─────────────────────────────────────────────────────────
export function GlobalSearch() {
  const { isOpen, openSearch, closeSearch, recentItems } = useSearch()
  const navigate = useNavigate()
  const inputRef = useRef(null)
  const resultsRef = useRef(null)

  const [query, setQuery] = useState('')
  const [focusedIndex, setFocusedIndex] = useState(-1)

  // ── Search results ───────────────────────────────────────────────────────
  // useMemo: only recompute when query changes. Fixtures are static imports,
  // so there's no async step — just filter + sort on each keystroke.
  const searchResults = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (q.length < 2) return null

    const txGroup = searchTransactions(q)
    const custGroup = searchCustomers(q)
    const accGroup = searchAccounts(q)
    const recGroup = searchRecipients(q)

    return { txGroup, custGroup, accGroup, recGroup }
  }, [query])

  // Flat list of results for keyboard nav (group headers not included).
  // Recent items: look up full display data from fixtures by type+id.
  const flatResults = useMemo(() => {
    if (!searchResults) {
      return recentItems
        .map((item) => lookupRecentResult(item.type, item.id))
        .filter(Boolean)
    }
    const { txGroup, custGroup, accGroup, recGroup } = searchResults
    return [
      ...txGroup.results,
      ...custGroup.results,
      ...accGroup.results,
      ...recGroup.results,
    ]
  }, [searchResults, recentItems])

  const hasResults = flatResults.length > 0
  const showResultsCard = isOpen && (hasResults || (query.trim().length >= 2 && !hasResults))

  // ── Select handler ───────────────────────────────────────────────────────
  const handleSelect = useCallback(
    (result) => {
      closeSearch()
      navigate(result.navPath, { state: result.navState })
    },
    [closeSearch, navigate],
  )

  // ── Focus input when opened ──────────────────────────────────────────────
  // We delay by one frame to let the animation start before the browser
  // focuses — avoids a jarring layout shift on some browsers.
  useEffect(() => {
    if (isOpen) {
      const raf = requestAnimationFrame(() => {
        inputRef.current?.focus()
      })
      return () => cancelAnimationFrame(raf)
    } else {
      // Reset state when closed
      const t = setTimeout(() => {
        setQuery('')
        setFocusedIndex(-1)
      }, 150) // after close animation completes
      return () => clearTimeout(t)
    }
  }, [isOpen])

  // ── Global keyboard shortcut ─────────────────────────────────────────────
  // cmd+k or ctrl+k: toggle. Skip if a non-search input is focused.
  // Escape: close when open.
  useEffect(() => {
    function onKeyDown(e) {
      // Escape — close
      if (e.key === 'Escape' && isOpen) {
        e.preventDefault()
        closeSearch()
        return
      }

      // cmd+k / ctrl+k — toggle
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        const activeEl = document.activeElement
        const isOurInput = inputRef.current && activeEl === inputRef.current
        const isOtherTextInput =
          !isOurInput &&
          (activeEl?.tagName === 'INPUT' ||
            activeEl?.tagName === 'TEXTAREA' ||
            activeEl?.tagName === 'SELECT' ||
            activeEl?.isContentEditable)

        // Don't steal focus from a form the user is actively filling out
        if (isOtherTextInput) return

        e.preventDefault()
        if (isOpen) closeSearch()
        else openSearch()
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [isOpen, openSearch, closeSearch])

  // ── Input keyboard navigation ────────────────────────────────────────────
  // Arrow keys move the focused result highlight without moving DOM focus.
  // Enter selects the highlighted result. Focus stays in the input throughout.
  function handleInputKeyDown(e) {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setFocusedIndex((i) => Math.min(i + 1, flatResults.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setFocusedIndex((i) => Math.max(i - 1, 0))
    } else if (e.key === 'Enter' && focusedIndex >= 0 && focusedIndex < flatResults.length) {
      handleSelect(flatResults[focusedIndex])
    }
  }

  // ── Scroll focused result into view ─────────────────────────────────────
  useEffect(() => {
    if (focusedIndex < 0 || !resultsRef.current) return
    const rows = resultsRef.current.querySelectorAll('[data-result-row]')
    rows[focusedIndex]?.scrollIntoView({ block: 'nearest' })
  }, [focusedIndex])

  // ── Render ───────────────────────────────────────────────────────────────

  // Build the results sections for rendering
  function renderResultSections() {
    if (!searchResults) {
      // flatResults already contains looked-up recent items
      if (flatResults.length === 0) return null
      return (
        <>
          <GroupHeader label="Recent" isFirst />
          {flatResults.map((result, i) => (
            <div key={result.id} data-result-row>
              <ResultRow
                result={result}
                isFocused={focusedIndex === i}
                onMouseEnter={() => setFocusedIndex(i)}
                onClick={() => handleSelect(result)}
              />
            </div>
          ))}
        </>
      )
    }

    const { txGroup, custGroup, accGroup, recGroup } = searchResults
    const groups = [
      { label: 'Transactions', group: txGroup, navPath: '/dashboard/transactions' },
      { label: 'Customers', group: custGroup, navPath: '/dashboard/customers' },
      { label: 'Accounts', group: accGroup, navPath: '/dashboard/accounts' },
      { label: 'Recipients', group: recGroup, navPath: '/dashboard/recipients' },
    ].filter((g) => g.group.results.length > 0)

    if (groups.length === 0) {
      return (
        <div className="px-4 py-8 text-center">
          <p className="text-sm text-content-secondary mb-1">No results for &ldquo;{query.trim()}&rdquo;</p>
          <p className="text-xs text-content-quaternary">Try a transaction ID, customer name, or wallet address.</p>
        </div>
      )
    }

    let flatIndex = 0
    return groups.map(({ label, group, navPath }, groupIdx) => (
      <div key={label}>
        <GroupHeader
          label={label}
          isFirst={groupIdx === 0}
          seeAllCount={group.total > 3 ? group.total : 0}
          onSeeAll={() => { closeSearch(); navigate(navPath) }}
        />
        {group.results.map((result, resultIdx) => {
          const myIndex = flatIndex++
          return (
            <div key={result.id} data-result-row className={resultIdx === 0 ? 'border-t border-border-primary-light' : ''}>
              <ResultRow
                result={result}
                isFocused={focusedIndex === myIndex}
                onMouseEnter={() => setFocusedIndex(myIndex)}
                onClick={() => handleSelect(result)}
              />
            </div>
          )
        })}
      </div>
    ))
  }

  return (
    <>
      {/* Floating pill trigger — fixed bottom-center.
          Hidden on mobile (md:hidden) — replaced by the search icon in MobileTopBar.
          cmd+k is meaningless on touch devices, and the pill would overlap content.
          When isOpen, fades out and scales up slightly to suggest it's
          "morphing" into the full search bar that rises from the same spot.
          -translate-x-1/2 is in style (not className) so we can combine it
          with the open/close scale without the two transforms fighting. */}
      <button
        type="button"
        aria-label="Open search (⌘K)"
        onClick={openSearch}
        className="hidden md:flex fixed bottom-6 left-1/2 z-40 items-center gap-2 px-3.5 py-2 bg-surface-primary border border-border-primary-light rounded-xl text-content-tertiary text-sm hover:border-border-primary-dark hover:text-content-secondary shadow-md cursor-pointer"
        style={{
          transform: isOpen ? 'translateX(-50%) scale(1.06)' : 'translateX(-50%) scale(1)',
          opacity: isOpen ? 0 : 1,
          pointerEvents: isOpen ? 'none' : 'auto',
          transition: isOpen
            ? 'opacity 120ms ease-out, transform 150ms ease-out'
            : 'opacity 200ms ease-in, transform 200ms ease-in, border-color 150ms, color 150ms',
        }}
      >
        <Search width={13} height={13} />
        <span>Search</span>
        <Key>⌘K</Key>
      </button>

      {/* Overlay — always in DOM, opacity/pointer-events controlled by isOpen.
          z-[60] ensures it sits above the GlobalPanel (z-50 for panel toasts). */}
      <div
        className="fixed inset-0 z-[60]"
        style={{ pointerEvents: isOpen ? 'auto' : 'none' }}
        aria-hidden={!isOpen}
      >
        {/* Backdrop — subtle darkening, click to close */}
        <div
          className="absolute inset-0"
          style={{
            backgroundColor: 'rgb(21, 21, 22, 0.05)',
            opacity: isOpen ? 1 : 0,
            transition: isOpen ? 'opacity 150ms ease-out' : 'opacity 120ms ease-in',
          }}
          onClick={closeSearch}
        />

        {/* Gradient wash — light bleeding up from the bottom.
            Not a card or container — just atmosphere. The gradient fades in
            slightly before the search bar slides up (see animation sequencing
            note at top of file). */}
        <div
          className="absolute inset-x-0 bottom-0 h-[50vh] pointer-events-none"
          style={{
            background: 'linear-gradient(to top, rgb(12, 104, 235, 0.20) 0%, rgb(12, 104, 235, 0.10) 20%, transparent 100%)',
            opacity: isOpen ? 1 : 0,
            transition: isOpen ? 'opacity 150ms ease-out' : 'opacity 120ms ease-in',
          }}
        />

        {/* Search UI — centered horizontally, 80px from bottom.
            Starts at translateY(56px) when closed — that's the pill's position
            (bottom-20 minus bottom-6 = 56px lower), so it appears to rise out
            of the pill. Closing reverses: bar shrinks back toward pill position. */}
        <div
          className="absolute inset-x-0 mx-auto bottom-20 w-full px-4 md:px-0 md:w-[600px] md:max-w-[90vw]"
          style={{
            opacity: isOpen ? 1 : 0,
            transform: isOpen ? 'translateY(0px)' : 'translateY(56px)',
            pointerEvents: isOpen ? 'auto' : 'none',
            transition: isOpen
              ? 'opacity 180ms ease-out 30ms, transform 220ms ease-out 30ms'
              : 'opacity 140ms ease-in, transform 160ms ease-in',
          }}
        >
          {/* Results card — grows upward above the search bar.
              This IS a contained card (border + radius) unlike the gradient. */}
          {showResultsCard && (
            <div
              ref={resultsRef}
              className="mb-2 bg-surface-primary border border-border-primary-main rounded-xl overflow-hidden overflow-y-auto"
              style={{ maxHeight: '320px' }}
            >
              {renderResultSections()}
            </div>
          )}

          {/* Search bar */}
          <div
            role="search"
            className="bg-surface-primary border border-border-primary-main rounded-xl flex items-center px-4 gap-3 shadow-sm"
            style={{ height: '52px' }}
          >
            <Search width={16} height={16} className="text-content-quaternary flex-shrink-0" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value)
                setFocusedIndex(-1)
              }}
              onKeyDown={handleInputKeyDown}
              placeholder="Search transactions, customers, accounts..."
              className="flex-1 bg-transparent text-md text-content-primary placeholder:text-content-tertiary outline-none min-w-0"
              aria-label="Search"
              aria-autocomplete="list"
              autoComplete="off"
              spellCheck={false}
            />
            <Key>ESC</Key>
          </div>
        </div>
      </div>
    </>
  )
}
