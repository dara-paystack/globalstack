import { useState, useCallback, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { X } from 'lucide-react'
import { usePageTitle } from '../lib/usePageTitle'
import {
  Skeleton,
  Pagination, PaginationContent, PaginationItem, PaginationPrevious, PaginationNext,
} from '@paystack/pax'
import { useTransactions } from '../hooks/useTransactions'
import { usePanelContext } from '../context/PanelContext'
import { useSearch } from '../context/SearchContext'
import { Badge } from '../components/ui/Badge'
import { PageHeader } from '../components/ui/PageHeader'
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
  usePageTitle('Transactions')
  const [status, setStatus] = useState('all')
  const [type, setType] = useState('all')

  // Cursor stack: index 0 = first page (null cursor), subsequent entries are
  // the `nextCursor` values returned by the server. This lets us page forward
  // and backward without re-fetching from the start.
  const [cursors, setCursors] = useState([null])
  const [cursorIndex, setCursorIndex] = useState(0)

  const { panelState, openPanel } = usePanelContext()
  const { addRecentItem } = useSearch()
  const location = useLocation()

  // Pre-open a specific transaction's detail panel when navigating here from
  // the "Needs attention" section on Overview (or any other deep-link context).
  useEffect(() => {
    const id = location.state?.openTransactionId
    if (id) openPanel('transaction', id)
  }, [location.state?.openTransactionId]) // eslint-disable-line react-hooks/exhaustive-deps

  // Account filter: set when arriving from an account panel "View all →" link.
  const [accountId, setAccountId] = useState(location.state?.filterAccountId ?? '')

  // Recipient filter: set when arriving from a recipient panel "View all →" link.
  // Carries a display label through router state so the pill shows the recipient name.
  const [recipientId, setRecipientId] = useState(location.state?.filterRecipientId ?? '')
  const [recipientLabel, setRecipientLabel] = useState(location.state?.filterRecipientLabel ?? '')

  const panelOpen = panelState.type === 'transaction'
  const currentCursor = cursors[cursorIndex]

  const { data: txns, meta, loading, error, refetch } = useTransactions({
    cursor: currentCursor ?? '',
    limit: PAGE_SIZE,
    status: fromSelect(status),
    type: fromSelect(type),
    accountId,
    recipientId,
  })

  // Filter change helpers — wrap each setter to also reset the cursor stack.
  // Passed as onChange to PageHeader filters so pagination resets on apply.
  const applyStatus = useCallback((val) => {
    setStatus(val)
    setCursors([null])
    setCursorIndex(0)
  }, [])

  const applyType = useCallback((val) => {
    setType(val)
    setCursors([null])
    setCursorIndex(0)
  }, [])

  function clearAccountId() {
    setAccountId('')
    setCursors([null])
    setCursorIndex(0)
  }

  function clearRecipientId() {
    setRecipientId('')
    setRecipientLabel('')
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
    addRecentItem('transaction', txn.id)
  }

  const filtersActive = fromSelect(status) !== '' || fromSelect(type) !== '' || accountId !== '' || recipientId !== ''

  // Filter definitions for PageHeader. The onChange callbacks wrap the setters
  // with cursor resets so filtering always returns to page 1.
  const filters = [
    {
      id: 'status',
      label: 'Status',
      options: STATUS_OPTIONS,
      value: status,
      defaultValue: 'all',
      onChange: applyStatus,
    },
    {
      id: 'type',
      label: 'Type',
      options: TYPE_OPTIONS,
      value: type,
      defaultValue: 'all',
      onChange: applyType,
    },
  ]

  return (
    <div className="space-y-8">
      {/* Page header — universal pattern. No action button on Transactions.
          Filters live outside the card so SelectContent portals freely above
          everything without hitting the card's overflow-hidden stacking context. */}
      <PageHeader title="Transactions" subtitle="All activity across your merchant and customer accounts." filters={filters} />

      {/* Context pills — shown when navigating from an account or recipient panel
          "View all →" link. Set by router state, not the filter panel dropdown. */}
      {(accountId || recipientId) && (
        <div className="flex items-center gap-1.5">
          {accountId && (
            <div className="flex items-center gap-1 pl-2.5 pr-1.5 py-1 text-xs font-medium rounded-full bg-surface-secondary border border-border-primary-light text-content-secondary">
              <span>Account: {accountId}</span>
              <button
                onClick={clearAccountId}
                className="ml-0.5 text-content-tertiary hover:text-content-primary cursor-pointer leading-none"
                aria-label="Remove account filter"
              >
                <X width={11} height={11} strokeWidth={2.5} />
              </button>
            </div>
          )}
          {recipientId && (
            <div className="flex items-center gap-1 pl-2.5 pr-1.5 py-1 text-xs font-medium rounded-full bg-surface-secondary border border-border-primary-light text-content-secondary">
              <span>Recipient: {recipientLabel || recipientId}</span>
              <button
                onClick={clearRecipientId}
                className="ml-0.5 text-content-tertiary hover:text-content-primary cursor-pointer leading-none"
                aria-label="Remove recipient filter"
              >
                <X width={11} height={11} strokeWidth={2.5} />
              </button>
            </div>
          )}
        </div>
      )}

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
              action={filtersActive ? {
                label: 'Clear filters',
                onClick: () => { applyStatus('all'); applyType('all'); clearAccountId(); clearRecipientId() }
              } : undefined}
            />
          ) : (
            <table className="w-full">
              {/* Mobile columns visible: Type, Amount, Status.
                  Reference, Source, Destination, Date hidden on mobile — recoverable in panel. */}
              <thead>
                <tr className="border-b border-border-primary-light bg-surface-secondary">
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-content-tertiary hidden md:table-cell">
                    Reference
                  </th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-content-tertiary">
                    Type
                  </th>
                  {/* Source: hidden on mobile AND when panel open */}
                  {!panelOpen && (
                    <th className="px-4 py-2.5 text-left text-xs font-medium text-content-tertiary hidden md:table-cell">
                      Source
                    </th>
                  )}
                  <th className="px-4 py-2.5 text-right text-xs font-medium text-content-tertiary">
                    Amount
                  </th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-content-tertiary hidden md:table-cell">
                    Destination
                  </th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-content-tertiary">
                    Status
                  </th>
                  <th className="px-4 py-2.5 text-right text-xs font-medium text-content-tertiary hidden md:table-cell">
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
                      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleRowClick(txn) } }}
                      tabIndex={0}
                      className={[
                        'cursor-pointer transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-action-primary-main focus-visible:ring-inset',
                        isSelected ? 'bg-surface-secondary' : 'hover:bg-surface-secondary',
                      ].join(' ')}
                    >
                      <td className="px-4 py-3 hidden md:table-cell">
                        <span className="text-xs font-mono text-content-secondary">{txn.id}</span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-col gap-0.5 items-start">
                          <Badge variant="type" value={txn.type} />
                          <span className="text-xs text-content-tertiary">{txn.corridor}</span>
                        </div>
                      </td>
                      {!panelOpen && (
                        <td className="px-4 py-3 text-sm text-content-secondary hidden md:table-cell">
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
                      <td className="px-4 py-3 text-sm text-content-secondary max-w-[180px] truncate hidden md:table-cell">
                        {txn.destination}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant="status" value={txn.status} />
                      </td>
                      <td className="px-4 py-3 text-sm text-content-tertiary text-right whitespace-nowrap hidden md:table-cell">
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
