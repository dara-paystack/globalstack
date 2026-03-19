import { useState, useEffect, useRef } from 'react'
import {
  Skeleton,
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
  Pagination, PaginationContent, PaginationItem, PaginationPrevious, PaginationNext,
} from '@paystack/pax'
import { Badge } from '../components/ui/Badge'
import { ErrorState } from '../components/ui/ErrorState'
import { formatDatetime } from '../lib/format'

// ─────────────────────────────────────────────────────────────────────────────
// Action label map — the raw event name is a machine identifier; what renders
// in the table is a human-readable sentence. We never display raw action strings.
// ─────────────────────────────────────────────────────────────────────────────
const ACTION_LABEL = {
  'customer.created':      'Created customer',
  'customer.kyc_approved': 'Approved KYC for customer',
  'customer.kyc_rejected': 'Rejected KYC for customer',
  'webhook.created':       'Added webhook endpoint',
  'webhook.deleted':       'Deleted webhook endpoint',
  'webhook.updated':       'Updated webhook endpoint',
  // api_key has two distinct events: viewing the page vs. copying the key.
  // Copying is higher-risk — it means the secret value was extracted to the clipboard.
  // Keeping them separate lets compliance teams filter for the copy action specifically.
  'api_key.viewed':        'Viewed API key page',
  'api_key.copied':        'Copied API key',
  'account.created':       'Created account for customer',
  'dashboard.login':       'Signed in to dashboard',
}

// Maps the masked IP suffixes to their approximate geographic locations.
// Used to enrich login events in the Target column — "where did this session come from?"
// is the key security signal for logins, more useful than just the IP string.
const IP_LOCATION = {
  '41.190.3.xxx':    'Lagos, Nigeria',
  '197.210.54.xxx':  'Nairobi, Kenya',
  '105.112.22.xxx':  'Accra, Ghana',
}

// Secondary context line — shown in muted text below the primary action label.
// Not every action has useful metadata to surface; return null to suppress it.
function getMetadataContext(action, metadata) {
  if (!metadata) return null

  if (action === 'customer.kyc_approved') {
    const from = metadata.from ? capitalize(metadata.from) : null
    const to = metadata.to ? capitalize(metadata.to) : null
    return from && to ? `Status changed: ${from} → ${to}` : null
  }
  if (action === 'customer.kyc_rejected') {
    const change = metadata.from && metadata.to
      ? `Status changed: ${capitalize(metadata.from)} → ${capitalize(metadata.to)}`
      : null
    // Append reason if present — keeps context in one line
    return metadata.reason ? `${change} • ${metadata.reason}` : change
  }
  if (action === 'webhook.updated' && metadata.field === 'events') {
    // Show subscription count delta — the full event list would be too wide
    const fromCount = metadata.from?.length ?? 0
    const toCount = metadata.to?.length ?? 0
    return `Subscriptions: ${fromCount} → ${toCount} event${toCount !== 1 ? 's' : ''}`
  }
  if (action === 'webhook.deleted' && metadata.reason) {
    return metadata.reason
  }
  if (action === 'account.created' && metadata.currency) {
    return `${metadata.currency} • ${metadata.type === 'on-chain' ? 'On-chain' : 'Fiat'} • ${metadata.customer}`
  }
  if (action === 'customer.created' && metadata.email) {
    return metadata.email
  }
  return null
}

function capitalize(str) {
  if (!str) return ''
  return str.charAt(0).toUpperCase() + str.slice(1)
}

// Radix UI Select (used by Pax Select) forbids value="" on SelectItem —
// it's reserved to mean "no selection". We use 'all' as the sentinel for
// "no filter" and convert it to '' when building the API request.
function fromSelect(val) {
  return val === 'all' ? '' : val
}

const ACTOR_OPTIONS = [
  { label: 'All actors', value: 'all' },
  { label: 'Tolu Adeyinka', value: 'Tolu Adeyinka' },
  { label: 'Amara Osei', value: 'Amara Osei' },
  { label: 'Chisom Eze', value: 'Chisom Eze' },
]

const ACTION_OPTIONS = [
  { label: 'All actions', value: 'all' },
  { label: 'Customer', value: 'customer' },
  { label: 'Webhook', value: 'webhook' },
  { label: 'API Key', value: 'api_key' },
  { label: 'Account', value: 'account' },
  { label: 'Login', value: 'login' },
]

const DATE_RANGE_OPTIONS = [
  { label: 'Last 7 days', value: 'last_7' },
  { label: 'Last 30 days', value: 'last_30' },
  { label: 'Last 90 days', value: 'last_90' },
]

const LIMIT = 20

// ─────────────────────────────────────────────────────────────────────────────
// Export notification — inline dismissible banner.
//
// Why not a Pax toast? The Pax Toast API requires a <Toaster> provider at the
// app root. Adding infrastructure to a single page for one button would be
// over-engineering. An inline banner is simpler, fully self-contained, and
// equally clear to the user.
// ─────────────────────────────────────────────────────────────────────────────
function ExportBanner({ onDismiss }) {
  return (
    <div className="flex items-center justify-between gap-4 px-4 py-3 bg-feedback-information-light border border-feedback-information-border rounded-xl text-sm text-feedback-information-main">
      <span>Export started. You'll receive an email when it's ready.</span>
      <button
        onClick={onDismiss}
        className="text-feedback-information-main hover:text-content-primary transition-colors leading-none cursor-pointer"
        aria-label="Dismiss"
      >
        ✕
      </button>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// AuditLog page
// ─────────────────────────────────────────────────────────────────────────────
export default function AuditLog() {
  // 'all' is the Radix sentinel for "no filter selected"
  const [actor, setActor] = useState('all')
  const [actionCategory, setActionCategory] = useState('all')
  const [dateRange, setDateRange] = useState('last_30')

  // Cursor stack: index 0 = first page (null cursor), subsequent entries are
  // the `nextCursor` values returned by the server. Lets us page forward and
  // backward without re-fetching from the start. Same pattern as Transactions.
  const [cursors, setCursors] = useState([null])
  const [cursorIndex, setCursorIndex] = useState(0)
  const currentCursor = cursors[cursorIndex]

  const [entries, setEntries] = useState([])
  const [meta, setMeta] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const [showExportNotice, setShowExportNotice] = useState(false)
  // Auto-dismiss the export notice after 5 seconds
  const exportTimerRef = useRef(null)

  function handleExport() {
    setShowExportNotice(true)
    clearTimeout(exportTimerRef.current)
    exportTimerRef.current = setTimeout(() => setShowExportNotice(false), 5000)
  }

  // Changing a filter resets the cursor stack to the first page.
  function handleActorChange(val) { setActor(val); setCursors([null]); setCursorIndex(0) }
  function handleActionChange(val) { setActionCategory(val); setCursors([null]); setCursorIndex(0) }
  function handleDateRangeChange(val) { setDateRange(val); setCursors([null]); setCursorIndex(0) }

  function handleNext() {
    if (!meta?.hasNext || !meta?.nextCursor) return
    setCursors((prev) => {
      if (prev[cursorIndex + 1] === meta.nextCursor) return prev
      const next = prev.slice(0, cursorIndex + 1)
      next.push(meta.nextCursor)
      return next
    })
    setCursorIndex((i) => i + 1)
  }

  function handlePrev() {
    if (cursorIndex === 0) return
    setCursorIndex((i) => i - 1)
  }

  async function loadAuditLog() {
    setLoading(true)
    setError(null)
    try {
      const resolvedActor = fromSelect(actor)
      const resolvedAction = fromSelect(actionCategory)
      const params = new URLSearchParams({
        limit: String(LIMIT),
        dateRange,
        ...(currentCursor && { cursor: currentCursor }),
        ...(resolvedActor && { actor: resolvedActor }),
        ...(resolvedAction && { action: resolvedAction }),
      })
      const res = await fetch(`/api/audit-log?${params}`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const json = await res.json()
      setEntries(json.data)
      setMeta(json.meta)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  // currentCursor changes when cursorIndex changes, so pagination and filter
  // resets both trigger a refetch through this single dependency.
  useEffect(() => {
    loadAuditLog()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentCursor, actor, actionCategory, dateRange])

  const filtersActive = actor !== 'all' || actionCategory !== 'all' || dateRange !== 'last_30'

  return (
    <div className="space-y-4">
      {/* Page header — title + description left, filters right.
          Filters live here (outside the card) so SelectContent portals freely
          above everything without hitting the card's overflow-hidden. Same layout
          pattern as Transactions. */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-content-primary leading-snug">
            Audit Log
          </h1>
          <p className="text-sm text-content-tertiary mt-0.5">
            A record of all actions taken on your account.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Select value={actor} onValueChange={handleActorChange}>
            <SelectTrigger className="w-44 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ACTOR_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={actionCategory} onValueChange={handleActionChange}>
            <SelectTrigger className="w-40 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ACTION_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={dateRange} onValueChange={handleDateRangeChange}>
            <SelectTrigger className="w-36 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {DATE_RANGE_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {filtersActive && (
            <button
              onClick={() => { handleActorChange('all'); handleActionChange('all'); handleDateRangeChange('last_30') }}
              className="text-sm text-action-primary-main hover:text-action-primary-dark font-medium cursor-pointer"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Export CSV row — sits where the filter bar was.
          Export CSV — UI only. Compliance export requires email delivery in
          production because audit log archives can be large and must be
          delivered through an auditable channel, not a browser download. */}
      <div className="flex items-center gap-3">
        <button
          onClick={handleExport}
          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg border border-border-primary-main text-sm font-medium text-content-secondary hover:text-content-primary hover:border-border-primary-dark transition-colors cursor-pointer"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
            <path d="M7 1v8M4 6l3 3 3-3M2 10v1a1 1 0 001 1h8a1 1 0 001-1v-1" />
          </svg>
          Export CSV
        </button>
        {/* Export notification banner — inline next to the button so it doesn't
            push page content down on dismiss. Dismisses automatically after 5s. */}
        {showExportNotice && (
          <ExportBanner onDismiss={() => setShowExportNotice(false)} />
        )}
      </div>

      {/* Table card */}
      <div className="bg-surface-primary border border-border-primary-light rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          {error ? (
            <ErrorState message={error} onRetry={loadAuditLog} />
          ) : loading ? (
            <LoadingSkeleton />
          ) : entries.length === 0 ? (
            <div className="py-16 text-center text-sm text-content-tertiary">
              No events match your filters.
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                {/* No background — matches Transactions table header style */}
                <tr className="border-b border-border-primary-light bg-surface-secondary">
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-content-tertiary whitespace-nowrap">
                    Timestamp
                  </th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-content-tertiary">
                    Actor
                  </th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-content-tertiary">
                    Action
                  </th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-content-tertiary">
                    Target
                  </th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-content-tertiary whitespace-nowrap">
                    IP Address
                  </th>
                </tr>
              </thead>
              {/* divide-y renders 1px separators between rows without extra padding.
                  Rows are intentionally not clickable — no cursor-pointer, no hover bg.
                  This is a read-only record, not an interactive list. */}
              <tbody className="divide-y divide-border-primary-light">
                {entries.map((entry) => (
                  <AuditRow key={entry.id} entry={entry} />
                ))}
              </tbody>
            </table>
          )}

          {!loading && entries.length > 0 && (meta?.hasNext || cursorIndex > 0) && (
            <div className="border-t border-border-primary-light px-4 py-2">
              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious
                      onClick={handlePrev}
                      disabled={cursorIndex === 0}
                      className="w-auto px-3 gap-1.5 text-sm [&>svg]:hidden"
                    >
                      Previous
                    </PaginationPrevious>
                  </PaginationItem>
                  <PaginationItem>
                    <PaginationNext
                      onClick={handleNext}
                      disabled={!meta?.hasNext}
                      className="w-auto px-3 gap-1.5 text-sm [&>svg]:hidden"
                    >
                      Next
                    </PaginationNext>
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// AuditRow — extracted to keep the table body readable.
//
// Row height target is ~44px (denser than Transactions at ~52px).
// Achieved with py-2.5 on cells vs py-3 elsewhere.
// ─────────────────────────────────────────────────────────────────────────────
function AuditRow({ entry }) {
  const label = ACTION_LABEL[entry.action] ?? entry.action
  const context = getMetadataContext(entry.action, entry.metadata)

  return (
    <tr>
      {/* Timestamp — always absolute, never relative. This is a compliance
          record; "2 min ago" is meaningless to an auditor. */}
      <td className="px-4 py-2.5 whitespace-nowrap align-top">
        <span className="font-mono text-xs text-content-primary tabular-nums">
          {formatDatetime(entry.timestamp)}
        </span>
      </td>

      {/* Actor — name primary, role as a neutral badge below */}
      <td className="px-4 py-2.5 align-top whitespace-nowrap">
        <div className="text-content-primary font-medium">{entry.actor.name}</div>
        <div className="mt-1">
          <Badge variant="type" value={entry.actor.role} />
        </div>
      </td>

      {/* Action — human-readable primary, metadata context muted below */}
      <td className="px-4 py-2.5 align-top max-w-[280px]">
        <div className="text-content-primary">{label}</div>
        {context && (
          <div className="text-xs text-content-tertiary mt-0.5 leading-relaxed">
            {context}
          </div>
        )}
      </td>

      {/* Target — for login events, the meaningful signal is WHERE the session came from
          (IP + city), not the generic "Dashboard" label. For all other actions, show
          the affected resource label + ID as usual.
          IP column shows "—" for login events because the location is already in Target. */}
      {entry.action === 'dashboard.login' ? (
        <>
          <td className="px-4 py-2.5 align-top">
            <div className="font-mono text-xs text-content-primary">{entry.actor.ip}</div>
            {IP_LOCATION[entry.actor.ip] && (
              <div className="text-xs text-content-tertiary mt-0.5">
                Session from {IP_LOCATION[entry.actor.ip]}
              </div>
            )}
          </td>
          <td className="px-4 py-2.5 align-top whitespace-nowrap">
            <span className="text-xs text-content-quaternary">—</span>
          </td>
        </>
      ) : (
        <>
          <td className="px-4 py-2.5 align-top">
            <div className="text-content-primary">{entry.target.label}</div>
            {entry.target.id && (
              <div className="text-xs text-content-tertiary mt-0.5 font-mono">
                {entry.target.id}
              </div>
            )}
          </td>
          <td className="px-4 py-2.5 align-top whitespace-nowrap">
            <span className="font-mono text-xs text-content-secondary">
              {entry.ip}
            </span>
          </td>
        </>
      )}
    </tr>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// LoadingSkeleton — 8 placeholder rows, 5 columns.
// ─────────────────────────────────────────────────────────────────────────────
function LoadingSkeleton() {
  return (
    <div className="divide-y divide-border-primary-light">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="grid grid-cols-[180px_160px_1fr_160px_120px] gap-4 px-4 py-2.5">
          <Skeleton className="h-4 w-36" />
          <div className="space-y-1.5">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-4 w-16" />
          </div>
          <div className="space-y-1.5">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-3 w-52" />
          </div>
          <div className="space-y-1.5">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-20" />
          </div>
          <Skeleton className="h-4 w-24" />
        </div>
      ))}
    </div>
  )
}
