import { useState, useCallback } from 'react'
import {
  Skeleton,
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
  Pagination, PaginationContent, PaginationItem, PaginationPrevious, PaginationNext,
} from '@paystack/pax'
import { useTransactions } from '../hooks/useTransactions'
import { usePanelContext } from '../context/PanelContext'
import { Badge } from '../components/ui/Badge'
import { EmptyState } from '../components/ui/EmptyState'
import { ErrorState } from '../components/ui/ErrorState'
import { formatAmount, formatDatetime } from '../lib/format'

// Radix UI Select forbids value="" on SelectItem (reserved for "no selection").
// We use 'all' as the sentinel and convert it to '' when passing to the hook.
//
// Grouped status dropdown: Active / Terminal / Problem. The grouping helps
// operators quickly scan — "is this stuck or done?" before reading the label.
// Radix SelectItem doesn't support disabled group headers natively, so we use
// a custom separator element styled to look like a group label.
const STATUS_OPTIONS = [
  { value: 'all', label: 'All statuses', group: null },
  { value: '_active', label: '── Active ──', group: 'separator' },
  { value: 'pending', label: 'Pending', group: 'active' },
  { value: '_terminal', label: '── Terminal ──', group: 'separator' },
  { value: 'completed', label: 'Completed', group: 'terminal' },
  { value: 'reversed', label: 'Reversed', group: 'terminal' },
  { value: '_problem', label: '── Problem ──', group: 'separator' },
  { value: 'failed', label: 'Failed', group: 'problem' },
  { value: 'canceled', label: 'Cancelled', group: 'problem' },
]

// Type options: DEPOSIT / WITHDRAWAL / CONVERSION only.
// On-ramp and off-ramp are removed — they are directions of a conversion,
// not transaction types. The corridor shown in the table makes direction obvious.
const TYPE_OPTIONS = [
  { value: 'all', label: 'All types' },
  { value: 'deposit', label: 'Deposit' },
  { value: 'withdrawal', label: 'Withdrawal' },
  { value: 'conversion', label: 'Conversion' },
]

// Sentinel values: 'all' → no filter, group separators (_active etc.) → no filter
function fromSelect(val) {
  if (val === 'all' || val?.startsWith('_')) return ''
  return val
}

const PAGE_SIZE = 10

function TableSkeleton() {
  return (
    <div className="divide-y divide-border-primary-light">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 px-4 py-3">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-16 rounded-full" />
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-4 w-28 ml-auto" />
          <Skeleton className="h-4 w-16 rounded-full" />
          <Skeleton className="h-4 w-32" />
        </div>
      ))}
    </div>
  )
}

export default function Transactions() {
  const [status, setStatus] = useState('all')
  const [type, setType] = useState('all')

  // Cursor stack: index 0 = first page (null cursor), subsequent entries are
  // the `nextCursor` values returned by the server. This lets us page forward
  // and backward without re-fetching from the start.
  const [cursors, setCursors] = useState([null])
  const [cursorIndex, setCursorIndex] = useState(0)

  const { panelState, openPanel } = usePanelContext()
  const panelOpen = panelState.type === 'transaction'

  const currentCursor = cursors[cursorIndex]

  const { data: txns, meta, loading, error, refetch } = useTransactions({
    cursor: currentCursor ?? '',
    limit: PAGE_SIZE,
    status: fromSelect(status),
    type: fromSelect(type),
  })

  // Changing a filter resets to the first page by clearing the cursor history.
  const handleFilterChange = useCallback((setter) => (value) => {
    setter(value)
    setCursors([null])
    setCursorIndex(0)
  }, [])

  function clearFilters() {
    setStatus('all')
    setType('all')
    setCursors([null])
    setCursorIndex(0)
  }

  function handleNext() {
    if (!meta.hasNext || !meta.nextCursor) return
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

  function handleRowClick(txn) {
    openPanel('transaction', txn.id)
  }

  const filtersActive = fromSelect(status) !== '' || fromSelect(type) !== ''

  return (
    <div className="space-y-4">
      {/* Page header — title left, filters right.
          Filters live here (outside the card) so SelectContent portals freely
          above everything without hitting the card's overflow-hidden stacking context. */}
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold text-content-primary leading-snug">Transactions</h1>
        <div className="flex items-center gap-2">
          <Select value={status} onValueChange={handleFilterChange(setStatus)}>
            <SelectTrigger className="w-40 text-sm">
              <SelectValue placeholder="All statuses" />
            </SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map((opt) =>
                opt.group === 'separator' ? (
                  // Group label — not a selectable item. Styled as muted uppercase text.
                  <div key={opt.value} className="px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-content-quaternary select-none">
                    {opt.label.replace(/─/g, '').trim()}
                  </div>
                ) : (
                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                )
              )}
            </SelectContent>
          </Select>

          <Select value={type} onValueChange={handleFilterChange(setType)}>
            <SelectTrigger className="w-36 text-sm">
              <SelectValue placeholder="All types" />
            </SelectTrigger>
            <SelectContent>
              {TYPE_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {filtersActive && (
            <button
              onClick={clearFilters}
              className="text-sm text-action-primary-main hover:text-action-primary-dark font-medium cursor-pointer"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Card: table only — no filter bar inside */}
      <div className="bg-surface-primary border border-border-primary-light rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          {error ? (
            <ErrorState message={error} onRetry={refetch} />
          ) : loading ? (
            <TableSkeleton />
          ) : txns.length === 0 ? (
            <EmptyState
              title="No transactions found"
              description={
                filtersActive
                  ? 'No transactions match your current filters.'
                  : 'Transactions will appear here once you have activity.'
              }
              action={filtersActive ? { label: 'Clear filters', onClick: clearFilters } : undefined}
            />
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-border-primary-light bg-surface-secondary">
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-content-tertiary">
                    Reference
                  </th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-content-tertiary">
                    Type
                  </th>
                  {/* Source column hidden when panel is open — recoverable in panel */}
                  {!panelOpen && (
                    <th className="px-4 py-2.5 text-left text-xs font-medium text-content-tertiary">
                      Source
                    </th>
                  )}
                  <th className="px-4 py-2.5 text-right text-xs font-medium text-content-tertiary">
                    Amount
                  </th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-content-tertiary">
                    Destination
                  </th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-content-tertiary">
                    Status
                  </th>
                  <th className="px-4 py-2.5 text-right text-xs font-medium text-content-tertiary">
                    Date
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-primary-light">
                {txns.map((txn) => {
                  const isSelected = panelState.type === 'transaction' && panelState.id === txn.id
                  return (
                    <tr
                      key={txn.id}
                      onClick={() => handleRowClick(txn)}
                      className={[
                        'cursor-pointer transition-colors',
                        isSelected ? 'bg-surface-secondary' : 'hover:bg-surface-secondary',
                      ].join(' ')}
                    >
                      <td className="px-4 py-3">
                        <span className="text-xs font-mono text-content-secondary">{txn.id}</span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-col gap-0.5 items-start">
                          <Badge variant="type" value={txn.type} />
                          <span className="text-xs text-content-tertiary">{txn.corridor}</span>
                        </div>
                      </td>
                      {!panelOpen && (
                        <td className="px-4 py-3 text-sm text-content-secondary">
                          {txn.sourceMethod}
                        </td>
                      )}
                      <td className="px-4 py-3 text-right tabular-nums">
                        <div className="text-sm font-semibold text-content-primary">
                          {formatAmount(txn.destAmount, txn.destCurrency)}
                        </div>
                        <div className="text-xs text-content-tertiary">
                          {formatAmount(txn.sourceAmount, txn.sourceCurrency)}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-content-secondary max-w-[180px] truncate">
                        {txn.destination}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant="status" value={txn.status} />
                      </td>
                      <td className="px-4 py-3 text-sm text-content-tertiary text-right whitespace-nowrap">
                        {formatDatetime(txn.createdAt)}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}

          {!loading && txns.length > 0 && (
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
                      disabled={!meta.hasNext}
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
