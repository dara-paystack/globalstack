// RequestLog — every inbound API request made to GlobalStack using the merchant's key.
//
// WHY THIS PAGE EXISTS:
// The Audit Log tracks what dashboard users do. The Transactions list tracks
// what settled financially. This page tracks a third thing: what the integration
// sent and whether the API accepted it. It's a developer debugging surface, not
// an operator monitoring surface. The audience is engineers asking:
//   "Is my payload correct?"
//   "Why did this call fail?"
//   "What's our error rate today?"
//
// DESIGN DECISIONS:
// — Summary strip is derived from fixture imports (fast, no extra fetch).
//   These stats don't need to be paginated or filtered — "today" is a fixed window.
// — Table shows the full resolved path (e.g. /fx/v1/customers/cus_001) not the
//   template — developers need to see which resource was actually touched.
// — Latency is coloured on the number itself, not a badge. Latency is continuous;
//   a badge implies discrete categorisation.
// — Method and status code use inline badge helpers (not Badge.jsx) since HTTP
//   semantics (GET/POST, 2xx/4xx/5xx) are specific to this page's domain.
//
// RESPONSIVE:
// — Summary strip: 2×2 on mobile, 4 across on desktop.
// — Table uses flex (not grid) so hidden items genuinely vacate space on mobile.
// — Mobile visible: Timestamp, Endpoint, Status. Hidden: Method, Latency, IP.
// — Chevron button (sibling, not nested) toggles inline expansion row showing
//   hidden columns as key-value pairs. Main row click still opens the panel.

import { useState, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { ChevronDown } from 'lucide-react'
import {
  Skeleton,
  Chip,
  Pagination, PaginationContent, PaginationItem, PaginationPrevious, PaginationNext,
} from '@paystack/pax'
import { usePageTitle } from '../lib/usePageTitle'
import { useRequestLog } from '../hooks/useRequestLog'
import { usePanelContext } from '../context/PanelContext'
import { PageHeader } from '../components/ui/PageHeader'
import { EmptyState } from '../components/ui/EmptyState'
import { ErrorState } from '../components/ui/ErrorState'
import { StatCard } from '../components/ui/StatCard'
import { formatDatetime } from '../lib/format'
import { requestLog as allRequests, REQUEST_LOG_ANCHOR, REQUEST_LOG_ENDPOINTS } from '../mocks/fixtures/requestLog'

// ── Pax Chip CVA workaround — force semantic bg + border (same pattern as Badge.jsx) ──
const CHIP_OVERRIDES = {
  success:     '!bg-feedback-success-light !border-feedback-success-border',
  information: '!bg-feedback-information-light !border-feedback-information-border',
  warning:     '!bg-feedback-warning-light !border-feedback-warning-border',
  error:       '!bg-feedback-danger-light !border-feedback-danger-border',
}

// 401 is always "error" even though it's in the 4xx range —
// an unauthorized request means the integration key is wrong or expired,
// which is always urgent. We don't group it with "fixable" 4xx errors.
function statusCodeColor(code) {
  if (code >= 200 && code < 300) return 'success'
  if (code === 401 || code >= 500) return 'error'
  if (code >= 400) return 'warning'
  return 'secondary'
}

function StatusCodeBadge({ code }) {
  const color = statusCodeColor(code)
  return (
    <Chip
      variant="status"
      color={color}
      className={CHIP_OVERRIDES[color] ?? ''}
    >
      {code}
    </Chip>
  )
}

// GET reads are safe (low urgency → neutral secondary).
// POST writes deserve slightly more attention (information blue) since they
// create or mutate state. Consistent with the badge principle: type labels
// use neutral colors, but here urgency matters more than category purity.
function MethodBadge({ method }) {
  const isPost = method === 'POST'
  return (
    <Chip
      variant="status"
      color={isPost ? 'information' : 'secondary'}
      className={isPost ? CHIP_OVERRIDES.information : ''}
    >
      {method}
    </Chip>
  )
}

// Color on the number itself — not a badge.
// Latency is a continuous value; using a badge would imply discrete thresholds
// ("this is a Warning badge") when what we actually mean is "this is slow."
function latencyClass(ms) {
  if (ms > 600) return 'text-feedback-danger-main font-medium tabular-nums'
  if (ms >= 300) return 'text-feedback-warning-dark font-medium tabular-nums'
  return 'text-content-tertiary tabular-nums'
}

// ── Summary stats — derived from today's fixture entries ─────────────────────
// Computed once at module level since the fixture is static.
// "Today" is anchored to REQUEST_LOG_ANCHOR (2026-03-19), not Date.now().
// Why: relative time calculations erode as the prototype ages; an anchor
// date produces consistent stats in any session.
const todayReqs = allRequests.filter((r) => r.timestamp.startsWith(REQUEST_LOG_ANCHOR))
const REQUESTS_TODAY = todayReqs.length
const successToday = todayReqs.filter((r) => r.statusCode >= 200 && r.statusCode < 300).length
const SUCCESS_RATE = REQUESTS_TODAY > 0 ? ((successToday / REQUESTS_TODAY) * 100).toFixed(1) : '0.0'
const AVG_LATENCY = REQUESTS_TODAY > 0
  ? Math.round(todayReqs.reduce((s, r) => s + r.latencyMs, 0) / REQUESTS_TODAY)
  : 0
const ERRORS_TODAY = todayReqs.filter((r) => r.statusCode >= 400).length

// Radix sentinel pattern — 'all' means "no filter"; convert to '' for the API
function fromSelect(val) {
  return val === 'all' ? '' : val
}

const METHOD_OPTIONS = [
  { label: 'All methods', value: 'all' },
  { label: 'GET', value: 'GET' },
  { label: 'POST', value: 'POST' },
]

const STATUS_OPTIONS = [
  { label: 'All statuses', value: 'all' },
  { label: '2xx  Success', value: '2xx' },
  { label: '4xx  Client error', value: '4xx' },
  { label: '5xx  Server error', value: '5xx' },
]

const DATE_RANGE_OPTIONS = [
  { label: 'Last 24 hours', value: 'last_24h' },
  { label: 'Last 7 days', value: 'last_7' },
  { label: 'Last 30 days', value: 'last_30' },
]

// Endpoint options built from the fixture's unique endpoint list
const ENDPOINT_OPTIONS = [
  { label: 'All endpoints', value: 'all' },
  ...REQUEST_LOG_ENDPOINTS.map((ep) => ({ label: ep, value: ep })),
]

const LIMIT = 20

export default function RequestLog() {
  usePageTitle('Request Log')
  const location = useLocation()
  const { panelState, openPanel } = usePanelContext()

  // Read navigate state — Overview "View in request log →" passes
  // { dateRange: 'last_24h' } to filter to today's activity.
  const stateDate = location.state?.dateRange

  const [method, setMethod] = useState('all')
  const [statusGroup, setStatusGroup] = useState('all')
  const [endpoint, setEndpoint] = useState('all')
  const [dateRange, setDateRange] = useState(stateDate ?? 'last_7')
  const [page, setPage] = useState(1)

  // Tracks which row IDs have their mobile inline expansion open.
  // Set is used (not array) so has() + delete() are O(1).
  const [expandedRows, setExpandedRows] = useState(new Set())

  function toggleRow(id) {
    setExpandedRows((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  // Apply navigate state on first mount — don't re-apply on subsequent renders
  useEffect(() => {
    if (stateDate) {
      setDateRange(stateDate)
      // Clear the router state so refreshing the page doesn't re-apply it
      window.history.replaceState({}, '')
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Filter change helpers — also reset to page 1 on apply
  function applyMethod(val) { setMethod(val); setPage(1) }
  function applyStatus(val) { setStatusGroup(val); setPage(1) }
  function applyEndpoint(val) { setEndpoint(val); setPage(1) }
  function applyDateRange(val) { setDateRange(val); setPage(1) }

  const { data: entries, meta, loading, error, refetch } = useRequestLog({
    page,
    limit: LIMIT,
    method: fromSelect(method),
    statusGroup: fromSelect(statusGroup),
    endpoint: fromSelect(endpoint),
    dateRange,
  })

  const filtersActive = method !== 'all' || statusGroup !== 'all' || endpoint !== 'all' || dateRange !== 'last_7'

  // Filter definitions for PageHeader
  const filters = [
    {
      id: 'method',
      label: 'Method',
      options: METHOD_OPTIONS,
      value: method,
      defaultValue: 'all',
      onChange: applyMethod,
    },
    {
      id: 'status',
      label: 'Status',
      options: STATUS_OPTIONS,
      value: statusGroup,
      defaultValue: 'all',
      onChange: applyStatus,
    },
    {
      id: 'endpoint',
      label: 'Endpoint',
      options: ENDPOINT_OPTIONS,
      value: endpoint,
      defaultValue: 'all',
      onChange: applyEndpoint,
    },
    {
      id: 'dateRange',
      label: 'Date range',
      options: DATE_RANGE_OPTIONS,
      value: dateRange,
      defaultValue: 'last_7',
      onChange: applyDateRange,
    },
  ]

  return (
    <div className="space-y-8">

      {/* ── Page header ──────────────────────────────────────────────── */}
      <PageHeader
        title="Request Log"
        subtitle="All API requests made to GlobalStack using your secret key."
        filters={filters}
      />

      {/* ── Summary strip — today's stats from fixture ───────────────── */}
      {/* 2×2 on mobile, 4 across on desktop. Stats are derived once at module level
          from the fixture — fast, no additional API call.
          Why not the API response? The API returns paginated/filtered data;
          "requests today" is always the full-day picture regardless of
          what filters the operator currently has active. */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Requests today" value={REQUESTS_TODAY.toLocaleString()} />
        <StatCard label="Success rate" value={`${SUCCESS_RATE}%`} />
        <StatCard label="Avg latency" value={`${AVG_LATENCY}ms`} />
        <StatCard
          label="Errors today"
          value={ERRORS_TODAY}
          valueClass={ERRORS_TODAY > 0 ? 'text-feedback-danger-main' : undefined}
        />
      </div>

      {/* ── Table ────────────────────────────────────────────────────── */}
      {/* WHY FLEX NOT GRID:
          The desktop layout used CSS grid with fixed pixel column widths. When
          hiding columns via display:none on mobile, CSS grid removes the hidden
          items but doesn't reflow remaining columns — everything shifts.
          Flex with explicit widths on each cell solves this: hidden items take
          no space, visible items fill their own fixed or flex-1 widths. */}
      <div className="bg-surface-primary border border-border-primary-light rounded-xl overflow-hidden">

        {/* Table header — flex mirrors the row layout */}
        <div className="flex items-center bg-surface-secondary border-b border-border-primary-light">
          <div className="flex-1 flex items-center px-4 py-2.5 min-w-0">
            {/* Timestamp — narrower on mobile (shorter date format fits) */}
            <div className="w-[100px] md:w-[160px] shrink-0 text-xs font-medium text-content-tertiary">
              Timestamp
            </div>
            {/* Method — hidden on mobile */}
            <div className="hidden md:block w-[72px] shrink-0 text-xs font-medium text-content-tertiary">
              Method
            </div>
            {/* Endpoint — fills remaining space */}
            <div className="flex-1 min-w-0 text-xs font-medium text-content-tertiary">
              Endpoint
            </div>
            {/* Status */}
            <div className="w-[72px] shrink-0 text-xs font-medium text-content-tertiary">
              Status
            </div>
            {/* Latency — hidden on mobile */}
            <div className="hidden md:block w-[72px] shrink-0 text-xs font-medium text-content-tertiary text-right">
              Latency
            </div>
            {/* IP — hidden on mobile */}
            <div className="hidden md:block w-[100px] shrink-0 text-xs font-medium text-content-tertiary">
              IP
            </div>
          </div>
          {/* Spacer matching chevron button width — mobile only */}
          <div className="md:hidden w-11 shrink-0" />
        </div>

        {/* Loading skeletons */}
        {loading && (
          <div className="divide-y divide-border-primary-light">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="flex items-center">
                <div className="flex-1 flex items-center gap-0 px-4 py-3 min-w-0">
                  <div className="w-[100px] md:w-[160px] shrink-0">
                    <Skeleton className="h-3.5 w-24 md:w-36" />
                  </div>
                  <div className="hidden md:block w-[72px] shrink-0">
                    <Skeleton className="h-5 w-10 rounded-full" />
                  </div>
                  <div className="flex-1 min-w-0 pr-4">
                    <Skeleton className="h-3.5 w-40 md:w-56" />
                  </div>
                  <div className="w-[72px] shrink-0">
                    <Skeleton className="h-5 w-10 rounded-full" />
                  </div>
                  <div className="hidden md:block w-[72px] shrink-0 flex justify-end">
                    <Skeleton className="h-3.5 w-12" />
                  </div>
                  <div className="hidden md:block w-[100px] shrink-0">
                    <Skeleton className="h-3.5 w-20" />
                  </div>
                </div>
                <div className="md:hidden w-11 shrink-0" />
              </div>
            ))}
          </div>
        )}

        {/* Error state */}
        {!loading && error && (
          <div className="p-8">
            <ErrorState onRetry={refetch} />
          </div>
        )}

        {/* Empty state */}
        {!loading && !error && entries.length === 0 && (
          <div className="p-8">
            <EmptyState
              message={filtersActive ? 'No requests match your filters.' : 'No requests found.'}
              action={filtersActive ? {
                label: 'Clear filters',
                onClick: () => { applyMethod('all'); applyStatus('all'); applyEndpoint('all'); applyDateRange('last_7') }
              } : undefined}
            />
          </div>
        )}

        {/* Rows */}
        {!loading && !error && entries.length > 0 && (
          <div className="divide-y divide-border-primary-light">
            {entries.map((req) => {
              const isSelected = panelState.id === req.id
              const isExpanded = expandedRows.has(req.id)

              return (
                <div
                  key={req.id}
                  className={isSelected ? 'bg-surface-secondary' : ''}
                >
                  {/* Row — flex so hidden cells genuinely remove their width on mobile.
                      Main clickable area and expand chevron are siblings (not nested)
                      so both can be interactive elements without invalid HTML nesting. */}
                  <div className="flex items-stretch hover:bg-surface-secondary transition-colors">

                    {/* Main clickable area — opens the detail panel */}
                    <button
                      onClick={() => openPanel('requestLog', req.id)}
                      className="flex-1 flex items-center px-4 py-3 text-left min-w-0 cursor-pointer"
                    >
                      {/* Timestamp */}
                      <div className="w-[100px] md:w-[160px] shrink-0 text-xs text-content-secondary tabular-nums">
                        {formatDatetime(req.timestamp)}
                      </div>

                      {/* Method — hidden on mobile (shown in expansion) */}
                      <div className="hidden md:block w-[72px] shrink-0">
                        <MethodBadge method={req.method} />
                      </div>

                      {/* Endpoint — full resolved path, monospace.
                          truncate prevents overflow when the panel is open (table narrows). */}
                      <div className="flex-1 min-w-0 pr-2 md:pr-4">
                        <div className="text-xs font-mono text-content-primary truncate">
                          {req.path}
                        </div>
                        {req.errorMessage && (
                          <div className="text-xs text-content-tertiary mt-0.5 truncate">
                            {req.errorMessage}
                          </div>
                        )}
                      </div>

                      {/* Status code */}
                      <div className="w-[72px] shrink-0">
                        <StatusCodeBadge code={req.statusCode} />
                      </div>

                      {/* Latency — right-aligned, colored. Hidden on mobile. */}
                      <div className={['hidden md:block w-[72px] shrink-0 text-xs text-right', latencyClass(req.latencyMs)].join(' ')}>
                        {req.latencyMs}ms
                      </div>

                      {/* IP address — hidden on mobile */}
                      <div className="hidden md:block w-[100px] shrink-0 text-xs font-mono text-content-tertiary">
                        {req.ipAddress}
                      </div>
                    </button>

                    {/* Expand chevron — mobile only. Sibling of main button (not nested inside).
                        44×44px touch target. stopPropagation not needed — it's a sibling. */}
                    <button
                      className="md:hidden w-11 shrink-0 flex items-center justify-center text-content-tertiary cursor-pointer"
                      onClick={() => toggleRow(req.id)}
                      aria-label={isExpanded ? 'Collapse details' : 'Expand details'}
                    >
                      <ChevronDown
                        width={14}
                        height={14}
                        strokeWidth={2}
                        className={isExpanded ? 'rotate-180 transition-transform duration-150' : 'transition-transform duration-150'}
                      />
                    </button>
                  </div>

                  {/* Inline expansion — mobile only.
                      Shows Method, Latency, IP that are hidden from the main row.
                      Grid layout: 2 columns, IP spans full width. */}
                  {isExpanded && (
                    <div className="md:hidden px-4 pb-3 pt-2 bg-surface-secondary border-t border-border-primary-light">
                      <dl className="grid grid-cols-2 gap-x-6 gap-y-2.5">
                        <div>
                          <dt className="text-xs text-content-tertiary mb-1">Method</dt>
                          <dd><MethodBadge method={req.method} /></dd>
                        </div>
                        <div>
                          <dt className="text-xs text-content-tertiary mb-1">Latency</dt>
                          <dd className={['text-xs', latencyClass(req.latencyMs)].join(' ')}>
                            {req.latencyMs}ms
                          </dd>
                        </div>
                        <div className="col-span-2">
                          <dt className="text-xs text-content-tertiary mb-1">IP Address</dt>
                          <dd className="text-xs font-mono text-content-secondary">{req.ipAddress}</dd>
                        </div>
                      </dl>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {!loading && entries.length > 0 && (
          <div className="border-t border-border-primary-light px-4 py-2">
            <Pagination>
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page <= 1}
                    className="w-auto px-3 gap-1.5 text-sm [&>svg]:hidden"
                  >
                    Previous
                  </PaginationPrevious>
                </PaginationItem>
                <PaginationItem>
                  <PaginationNext
                    onClick={() => setPage((p) => Math.min(meta.totalPages, p + 1))}
                    disabled={page >= meta.totalPages}
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
  )
}
