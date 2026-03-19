import { useState, useEffect, useRef } from 'react'
import { Download, ChevronDown } from 'lucide-react'
import { usePageTitle } from '../lib/usePageTitle'
import {
  Skeleton,
  Pagination, PaginationContent, PaginationItem, PaginationPrevious, PaginationNext,
} from '@paystack/pax'
import { Badge } from '../components/ui/Badge'
import { PageHeader } from '../components/ui/PageHeader'
import { EmptyState } from '../components/ui/EmptyState'
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
  'transfer.created':      'Initiated transfer',
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
  if (action === 'transfer.created' && metadata.amount && metadata.currency) {
    const formatted = metadata.amount.toLocaleString('en-US', { maximumFractionDigits: 2 })
    return `${formatted} ${metadata.currency.toUpperCase()}`
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
  { label: 'API Keys', value: 'api_key' },
  { label: 'Account', value: 'account' },
  { label: 'Login', value: 'login' },
  { label: 'Transfer', value: 'transfer' },
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
  usePageTitle('Audit Logs')
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
  const exportTimerRef = useRef(null)

  // Mobile expandable rows — tracks which row IDs are expanded.
  // Set (not object) for O(1) has/add/delete. Persists within a page session;
  // resets when filters change (entries re-fetched = new IDs).
  const [expandedRows, setExpandedRows] = useState(new Set())

  function toggleRow(id) {
    setExpandedRows((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function handleExport() {
    setShowExportNotice(true)
    clearTimeout(exportTimerRef.current)
    exportTimerRef.current = setTimeout(() => setShowExportNotice(false), 5000)
  }

  // Changing a filter resets the cursor stack to the first page.
  // These are passed as onChange to PageHeader filters.
  function applyActor(val) { setActor(val); setCursors([null]); setCursorIndex(0) }
  function applyAction(val) { setActionCategory(val); setCursors([null]); setCursorIndex(0) }
  function applyDateRange(val) { setDateRange(val); setCursors([null]); setCursorIndex(0) }

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

  // Filter definitions for PageHeader.
  // dateRange uses 'last_30' as its default (not 'all') — it's always active,
  // but it only contributes to the active count when changed from the default.
  const filters = [
    {
      id: 'actor',
      label: 'Actor',
      options: ACTOR_OPTIONS,
      value: actor,
      defaultValue: 'all',
      onChange: applyActor,
    },
    {
      id: 'action',
      label: 'Action',
      options: ACTION_OPTIONS,
      value: actionCategory,
      defaultValue: 'all',
      onChange: applyAction,
    },
    {
      id: 'dateRange',
      label: 'Date range',
      options: DATE_RANGE_OPTIONS,
      value: dateRange,
      defaultValue: 'last_30',
      onChange: applyDateRange,
    },
  ]

  return (
    <div className="space-y-8">
      {/* Page header — filters panel + Export CSV as primary action.
          Export CSV is UI-only. Compliance export requires email delivery in
          production because audit log archives can be large and must be
          delivered through an auditable channel, not a browser download. */}
      <PageHeader
        title="Audit Logs"
        subtitle="A record of all actions taken on your account."
        filters={filters}
        primaryAction={{
          label: 'Export CSV',
          icon: <Download width={14} height={14} strokeWidth={1.75} />,
          onClick: handleExport,
        }}
      />

      {/* Export notification banner — appears below the header row on export click.
          Dismisses automatically after 5s. Inline rather than a toast to avoid
          needing a Toaster provider at the app root. */}
      {showExportNotice && (
        <ExportBanner onDismiss={() => setShowExportNotice(false)} />
      )}

      {/* Table card */}
      <div className="bg-surface-primary border border-border-primary-light rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          {error ? (
            <ErrorState message={error} onRetry={loadAuditLog} />
          ) : loading ? (
            <LoadingSkeleton />
          ) : entries.length === 0 ? (
            <EmptyState
              title="No events found"
              description={filtersActive ? 'No events match your current filters.' : 'No audit events have been recorded yet.'}
              action={filtersActive ? { label: 'Clear filters', onClick: () => { applyActor('all'); applyAction('all'); applyDateRange('last_30') } } : undefined}
            />
          ) : (<>
            {/* Mobile: Timestamp + Action visible. Actor, Target, IP hidden.
                Tap row to expand inline — shows hidden columns as key-value pairs.
                Why inline expansion vs a panel: AuditLog is read-only compliance data;
                building panel infrastructure (type, hook, GlobalPanel case) for a
                static detail view would be significant overhead. Inline expansion
                achieves the same disclosure with zero new infrastructure. */}
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border-primary-light bg-surface-secondary">
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-content-tertiary whitespace-nowrap">
                    Timestamp
                  </th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-content-tertiary hidden md:table-cell">
                    Actor
                  </th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-content-tertiary">
                    Action
                  </th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-content-tertiary hidden md:table-cell">
                    Target
                  </th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-content-tertiary whitespace-nowrap hidden md:table-cell">
                    IP Address
                  </th>
                  {/* Expand indicator — mobile only */}
                  <th className="px-3 py-2.5 md:hidden" aria-hidden="true" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border-primary-light">
                {entries.map((entry) => (
                  <AuditRow
                    key={entry.id}
                    entry={entry}
                    isExpanded={expandedRows.has(entry.id)}
                    onToggle={() => toggleRow(entry.id)}
                  />
                ))}
              </tbody>
            </table>
          </>)}


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
// AuditRow — supports mobile inline expansion for hidden columns.
//
// Desktop: all 5 columns visible, row not interactive (read-only record).
// Mobile: Timestamp + Action visible; tapping row expands an inline sub-row
// showing Actor, Target, IP as key-value pairs.
//
// The expand indicator (ChevronDown) only renders on mobile (md:hidden).
// ─────────────────────────────────────────────────────────────────────────────
function AuditRow({ entry, isExpanded, onToggle }) {
  const label = ACTION_LABEL[entry.action] ?? entry.action
  const context = getMetadataContext(entry.action, entry.metadata)

  // Derive Target display for the expanded mobile view
  const targetDisplay = entry.action === 'dashboard.login'
    ? { label: entry.actor.ip, sub: IP_LOCATION[entry.actor.ip] ? `Session from ${IP_LOCATION[entry.actor.ip]}` : null }
    : { label: entry.target.label, sub: entry.target.id ?? null }
  const ipDisplay = entry.action === 'dashboard.login' ? '—' : entry.ip

  return (
    <>
      <tr
        // Mobile: tappable to expand. Desktop: not interactive (compliance record).
        onClick={onToggle}
        className="md:cursor-default cursor-pointer"
      >
        {/* Timestamp — always absolute */}
        <td className="px-4 py-2.5 whitespace-nowrap align-top">
          <span className="font-mono text-xs text-content-primary tabular-nums">
            {formatDatetime(entry.timestamp)}
          </span>
        </td>

        {/* Actor — hidden on mobile */}
        <td className="px-4 py-2.5 align-top whitespace-nowrap hidden md:table-cell">
          <div className="text-content-primary font-medium">{entry.actor.name}</div>
          <div className="mt-1">
            <Badge variant="type" value={entry.actor.role} />
          </div>
        </td>

        {/* Action */}
        <td className="px-4 py-2.5 align-top max-w-[280px]">
          <div className="text-content-primary">{label}</div>
          {context && (
            <div className="text-xs text-content-tertiary mt-0.5 leading-relaxed">
              {context}
            </div>
          )}
        </td>

        {/* Target — hidden on mobile */}
        {entry.action === 'dashboard.login' ? (
          <>
            <td className="px-4 py-2.5 align-top hidden md:table-cell">
              <div className="font-mono text-xs text-content-primary">{entry.actor.ip}</div>
              {IP_LOCATION[entry.actor.ip] && (
                <div className="text-xs text-content-tertiary mt-0.5">
                  Session from {IP_LOCATION[entry.actor.ip]}
                </div>
              )}
            </td>
            <td className="px-4 py-2.5 align-top whitespace-nowrap hidden md:table-cell">
              <span className="text-xs text-content-quaternary">—</span>
            </td>
          </>
        ) : (
          <>
            <td className="px-4 py-2.5 align-top hidden md:table-cell">
              <div className="text-content-primary">{entry.target.label}</div>
              {entry.target.id && (
                <div className="text-xs text-content-tertiary mt-0.5 font-mono">
                  {entry.target.id}
                </div>
              )}
            </td>
            <td className="px-4 py-2.5 align-top whitespace-nowrap hidden md:table-cell">
              <span className="font-mono text-xs text-content-secondary">
                {entry.ip}
              </span>
            </td>
          </>
        )}

        {/* Expand chevron — mobile only */}
        <td className="px-3 py-2.5 align-middle md:hidden">
          <ChevronDown
            size={14}
            strokeWidth={2}
            className={`text-content-tertiary transition-transform duration-150 ${isExpanded ? 'rotate-180' : ''}`}
          />
        </td>
      </tr>

      {/* Inline expansion — mobile only. Shows hidden columns as key-value pairs. */}
      {isExpanded && (
        <tr className="md:hidden bg-surface-secondary">
          <td colSpan={3} className="px-4 py-3">
            <dl className="space-y-2 text-sm">
              <div className="flex gap-3">
                <dt className="w-16 shrink-0 text-xs text-content-tertiary">Actor</dt>
                <dd className="text-content-primary font-medium">{entry.actor.name}</dd>
              </div>
              <div className="flex gap-3">
                <dt className="w-16 shrink-0 text-xs text-content-tertiary">Target</dt>
                <dd className="text-content-primary">
                  {targetDisplay.label}
                  {targetDisplay.sub && (
                    <span className="block text-xs text-content-tertiary mt-0.5">{targetDisplay.sub}</span>
                  )}
                </dd>
              </div>
              <div className="flex gap-3">
                <dt className="w-16 shrink-0 text-xs text-content-tertiary">IP</dt>
                <dd className="font-mono text-xs text-content-secondary">{ipDisplay}</dd>
              </div>
            </dl>
          </td>
        </tr>
      )}
    </>
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
