import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Skeleton,
  Pagination, PaginationContent, PaginationItem, PaginationPrevious, PaginationNext,
} from '@paystack/pax'
import { useAccounts, useCustomerAccounts } from '../hooks/useAccounts'
import { usePanelContext } from '../context/PanelContext'
import { Badge } from '../components/ui/Badge'
import { ErrorState } from '../components/ui/ErrorState'
import { EmptyState } from '../components/ui/EmptyState'
import { formatUSDC, formatAmount } from '../lib/format'

// ─── Sort indicator arrow ─────────────────────────────────────────────────────
function SortArrow({ direction }) {
  return (
    <span className="ml-1 text-content-tertiary select-none">
      {direction === 'asc' ? '↑' : '↓'}
    </span>
  )
}

export default function Accounts() {
  // ── Banner stats: fetch all accounts once, compute aggregate client-side ──
  // Fetching all ~36 accounts for stats is fine at prototype scale.
  // In production you'd add a /api/accounts/summary endpoint returning
  // pre-computed totals rather than transferring all records to the client.
  const { data: allAccounts, loading: statsLoading, error: statsError, refetch: refetchStats } =
    useAccounts()
  const { panelState, openPanel } = usePanelContext()

  const merchantAccounts = allAccounts.filter((a) => a.owner === 'merchant')
  const merchantAsOf = merchantAccounts[0]?.asOf ?? null
  const customerAccountsAll = allAccounts.filter((a) => a.owner === 'customer')

  const merchantUsdcTotal = merchantAccounts.reduce(
    (sum, a) => (a.currency === 'USDC' ? sum + a.balance : sum),
    0,
  )
  const customerUsdcTotal = customerAccountsAll.reduce(
    (sum, a) => (a.currency === 'USDC' ? sum + a.balance : sum),
    0,
  )
  const customerOwnerCount = new Set(
    customerAccountsAll.filter((a) => a.customerId).map((a) => a.customerId),
  ).size

  // Largest single customer USDC account — useful for monitoring concentration risk
  const largestAccount = customerAccountsAll
    .filter((a) => a.currency === 'USDC' && a.balance > 0)
    .sort((a, b) => b.balance - a.balance)[0] ?? null

  // ── Customer accounts table state ─────────────────────────────────────────
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [sort, setSort] = useState('balance_desc')

  // Debounce search — avoids firing an MSW request on every keystroke.
  // 300ms is the standard sweet spot: fast enough to feel instant, slow enough
  // to skip intermediate keystrokes.
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search)
      setPage(1) // always reset to page 1 when search changes
    }, 300)
    return () => clearTimeout(timer)
  }, [search])

  const handleTypeFilter = useCallback((value) => {
    setTypeFilter(value)
    setPage(1)
  }, [])

  const handleSort = useCallback(() => {
    setSort((prev) => (prev === 'balance_desc' ? 'balance_asc' : 'balance_desc'))
    setPage(1)
  }, [])

  const {
    data: customerAccounts,
    meta,
    loading: tableLoading,
    error: tableError,
    refetch: refetchTable,
  } = useCustomerAccounts({ page, limit: 15, search: debouncedSearch, type: typeFilter, sort })

  // Hide Customer column when panel is open — space is tight at 420px panel width.
  // The panel already shows which customer the account belongs to.
  const panelOpen = panelState.type === 'account'

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-content-primary leading-snug">Accounts</h1>

      {/* ── Summary banner ────────────────────────────────────────────────── */}
      {statsLoading ? (
        <div className="bg-surface-primary border border-border-primary-light rounded-xl px-5 py-4 flex items-center gap-8">
          <div className="space-y-2">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-6 w-40" />
          </div>
          <div className="w-px h-10 bg-border-primary-light" />
          <div className="space-y-2">
            <Skeleton className="h-3 w-28" />
            <Skeleton className="h-6 w-40" />
            <Skeleton className="h-3 w-32" />
          </div>
          <div className="w-px h-10 bg-border-primary-light" />
          <div className="space-y-2">
            <Skeleton className="h-3 w-28" />
            <Skeleton className="h-6 w-36" />
            <Skeleton className="h-3 w-24" />
          </div>
        </div>
      ) : statsError ? null : (
        <div className="bg-surface-primary border border-border-primary-light rounded-xl px-5 py-4 flex items-top gap-8">
          {/* YOUR BALANCE — Acme Corp's own operational treasury */}
          <div>
            <div className="text-xs font-medium text-content-tertiary mb-2">
              Your balance
            </div>
            <div className="text-xl font-semibold text-content-primary tabular-nums leading-none">
              {formatUSDC(merchantUsdcTotal)}
            </div>
            {merchantAsOf && (
              <div className="text-xs text-content-tertiary mt-2">
                As of {new Intl.DateTimeFormat('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }).format(new Date(merchantAsOf))} today
              </div>
            )}
          </div>

          <div className="w-px h-10 bg-border-primary-light" />

          {/* UNDER MANAGEMENT — funds custodied for end-users, never combined with above */}
          <div>
            <div className="text-xs font-medium text-content-tertiary mb-2">
              Under management
            </div>
            <div className="text-xl font-semibold text-content-primary tabular-nums leading-none">
              {formatUSDC(customerUsdcTotal)}
            </div>
            <div className="text-xs text-content-tertiary mt-2">
              {customerAccountsAll.length} account{customerAccountsAll.length !== 1 ? 's' : ''} • {customerOwnerCount} customer{customerOwnerCount !== 1 ? 's' : ''}
            </div>
          </div>

          <div className="w-px h-10 bg-border-primary-light" />

          {/* LARGEST ACCOUNT — concentration risk signal for operators */}
          <div>
            <div className="text-xs font-medium text-content-tertiary mb-2">
              Largest account
            </div>
            {largestAccount ? (
              <>
                <div className="text-xl font-semibold text-content-primary tabular-nums leading-none">
                  {formatUSDC(largestAccount.balance)}
                </div>
                <div className="text-xs text-content-tertiary mt-2">
                  {largestAccount.customer}
                </div>
              </>
            ) : (
              <div className="text-xl font-semibold text-content-quaternary">—</div>
            )}
          </div>
        </div>
      )}

      {statsError && <ErrorState message={statsError} onRetry={refetchStats} />}

      {/* ── Section 1: Merchant accounts (unchanged) ──────────────────────── */}
      <div>
        <div className="px-1 mb-3">
          <span className="text-[11px] font-semibold uppercase tracking-widest text-content-tertiary">
            Your accounts
          </span>
        </div>
        <div className="bg-surface-primary border border-border-primary-light rounded-xl overflow-hidden">
          {statsLoading ? (
            <div className="divide-y divide-border-primary-light">
              {Array.from({ length: 1 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4 px-4 py-3">
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="h-5 w-16 rounded-full" />
                  <Skeleton className="h-4 w-16 ml-auto" />
                </div>
              ))}
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-border-primary-light bg-surface-secondary">
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-content-tertiary">Account</th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-content-tertiary">Type</th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-content-tertiary">Currency</th>
                  <th className="px-4 py-2.5 text-right text-xs font-medium text-content-tertiary">Balance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-primary-light">
                {merchantAccounts.map((acc) => {
                  const isSelected = panelState.type === 'account' && panelState.id === acc.id
                  return (
                    <tr
                      key={acc.id}
                      onClick={() => openPanel('account', acc.id)}
                      className={[
                        'cursor-pointer transition-colors',
                        isSelected ? 'bg-surface-secondary' : 'hover:bg-surface-secondary',
                      ].join(' ')}
                    >
                      <td className="px-4 py-3">
                        <div className="text-sm font-medium text-content-primary">{acc.label}</div>
                        <div className="text-xs text-content-tertiary mt-0.5 font-mono">{acc.addressShort}</div>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant="type" value={acc.type} />
                      </td>
                      <td className="px-4 py-3 text-sm text-content-secondary">{acc.currency}</td>
                      <td className="px-4 py-3 text-right tabular-nums text-sm font-medium text-content-primary">
                        {formatAmount(acc.balance, acc.currency)}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* ── Section 2: Customer accounts — flat paginated table ───────────── */}
      {/*
        WHY NO GROUPING:
        The previous grouped layout worked with 3 records across 2 customers but
        breaks at scale for three reasons:

        1. Pagination boundary problem: A customer with 4 accounts might have 2 on
           page 1 and 2 on page 2. The group header appears twice, or you'd need
           complex "continued from previous page" logic. Neither is acceptable.

        2. Sort conflicts with grouping: Sorting by balance globally (the most useful
           view for monitoring concentration risk) cuts across customer groups.
           The top 15 highest-balance accounts span multiple customers — grouping
           them by customer just adds noise.

        3. Search defeats grouping: Searching for "Primary Wallet" would show 5
           customer groups each with one account — group headers become decoration,
           not navigation.

        The Customer column makes the ownership relationship clear without needing
        group headers. Flat + searchable + sortable is the right pattern at any scale.
      */}
      <div>
        <div className="px-1 mb-3">
          <span className="text-[11px] font-semibold uppercase tracking-widest text-content-tertiary">
            Customer accounts
          </span>
        </div>

        {/* Controls row: search + type filter */}
        <div className="flex items-center gap-3 mb-3">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by account or customer…"
            className="h-9 w-64 px-3 text-sm bg-surface-primary border border-border-primary-light rounded-lg text-content-primary placeholder:text-content-quaternary focus:outline-none focus:ring-2 focus:ring-action-primary/20 focus:border-action-primary"
          />

          {/* Segmented type filter — 3 options, always visible, faster than a dropdown */}
          <div className="flex items-center gap-1 bg-surface-secondary border border-border-primary-light rounded-lg p-1">
            {[
              { label: 'All', value: '' },
              { label: 'On-chain', value: 'on-chain' },
              { label: 'Fiat', value: 'fiat' },
            ].map(({ label, value }) => (
              <button
                key={value}
                onClick={() => handleTypeFilter(value)}
                className={[
                  'h-7 px-3 text-xs font-medium rounded-md transition-colors',
                  typeFilter === value
                    ? 'bg-surface-primary text-content-primary shadow-sm'
                    : 'text-content-tertiary hover:text-content-secondary',
                ].join(' ')}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="bg-surface-primary border border-border-primary-light rounded-xl overflow-hidden">
          {tableError ? (
            <ErrorState message={tableError} onRetry={refetchTable} />
          ) : tableLoading ? (
            <div>
              {/* Skeleton header */}
              <div className="flex gap-4 px-4 py-2.5 border-b border-border-primary-light">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-3 w-16" />
                ))}
              </div>
              {/* Skeleton rows */}
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4 px-4 py-3 border-b border-border-primary-light last:border-b-0">
                  <div className="flex-1 space-y-1.5">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                  <Skeleton className="h-5 w-16 rounded-full" />
                  <Skeleton className="h-4 w-28" />
                  <Skeleton className="h-4 w-12" />
                  <Skeleton className="h-4 w-20 ml-auto" />
                </div>
              ))}
            </div>
          ) : customerAccounts.length === 0 ? (
            <EmptyState
              title={
                search
                  ? `No accounts match "${search}"`
                  : typeFilter
                  ? `No ${typeFilter === 'on-chain' ? 'on-chain' : 'fiat'} accounts`
                  : 'No customer accounts'
              }
              description={
                search || typeFilter
                  ? 'Clear your filters to see all accounts.'
                  : 'Customer accounts will appear here once created.'
              }
              action={
                search || typeFilter
                  ? {
                      label: 'Clear filters',
                      onClick: () => {
                        setSearch('')
                        setTypeFilter('')
                        setPage(1)
                      },
                    }
                  : undefined
              }
            />
          ) : (
            <>
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border-primary-light bg-surface-secondary">
                    <th className="px-4 py-2.5 text-left text-xs font-medium text-content-tertiary">
                      Account
                    </th>
                    <th className="px-4 py-2.5 text-left text-xs font-medium text-content-tertiary">
                      Type
                    </th>
                    {/* Customer column hidden when account panel is open to reclaim space */}
                    {!panelOpen && (
                      <th className="px-4 py-2.5 text-left text-xs font-medium text-content-tertiary">
                        Customer
                      </th>
                    )}
                    <th className="px-4 py-2.5 text-left text-xs font-medium text-content-tertiary">
                      Currency
                    </th>
                    {/* Clickable sort header — toggles asc/desc */}
                    <th
                      onClick={handleSort}
                      className="px-4 py-2.5 text-right text-xs font-medium text-content-tertiary cursor-pointer hover:text-content-secondary select-none"
                    >
                      Balance
                      <SortArrow direction={sort === 'balance_asc' ? 'asc' : 'desc'} />
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-primary-light">
                  {customerAccounts.map((acc) => (
                    <CustomerAccountRow
                      key={acc.id}
                      acc={acc}
                      panelState={panelState}
                      panelOpen={panelOpen}
                      onOpen={openPanel}
                    />
                  ))}
                </tbody>
              </table>

              {meta && meta.totalPages > 1 && (
                <div className="border-t border-border-primary-light px-4 py-2">
                  <Pagination>
                    <PaginationContent>
                      <PaginationItem>
                        <PaginationPrevious
                          onClick={() => setPage(page - 1)}
                          disabled={page === 1}
                          className="w-auto px-3 gap-1.5 text-sm [&>svg]:hidden"
                        >
                          Previous
                        </PaginationPrevious>
                      </PaginationItem>
                      <PaginationItem>
                        <PaginationNext
                          onClick={() => setPage(page + 1)}
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
            </>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Customer account row ─────────────────────────────────────────────────────
// Separated to keep the table body readable.
//
// The Customer column uses a <button> instead of a <Link> because:
// - The row itself is a clickable target (opens the account panel)
// - Nesting a <Link> inside a clickable <tr> creates competing click targets
// - A button with e.stopPropagation() is the correct pattern here:
//   click the name → navigate to /customers; click the row → open account panel
function CustomerAccountRow({ acc, panelState, panelOpen, onOpen }) {
  const navigate = useNavigate()
  const isSelected = panelState.type === 'account' && panelState.id === acc.id

  const handleCustomerClick = (e) => {
    e.stopPropagation()
    // Use router state to pre-open this customer's detail panel on the Customers page.
    // Why state instead of a URL param (?customerId=...)?
    // Opening a panel is ephemeral UI state — it shouldn't be in the URL, survive
    // a page refresh, or be shareable. Router state is the correct tool: it
    // survives the navigation but not a reload or a direct link.
    navigate('/customers', { state: { openCustomerId: acc.customerId } })
  }

  return (
    <tr
      onClick={() => onOpen('account', acc.id)}
      className={[
        'cursor-pointer transition-colors',
        isSelected ? 'bg-surface-secondary' : 'hover:bg-surface-secondary',
      ].join(' ')}
    >
      <td className="px-4 py-3">
        <div className="text-sm font-medium text-content-primary">{acc.label}</div>
        <div className="text-xs text-content-tertiary mt-0.5 font-mono">{acc.addressShort}</div>
      </td>
      <td className="px-4 py-3">
        <Badge variant="type" value={acc.type} />
      </td>
      {!panelOpen && (
        <td className="px-4 py-3">
          <button
            onClick={handleCustomerClick}
            className="text-sm link text-left"
          >
            {acc.customer}
          </button>
        </td>
      )}
      <td className="px-4 py-3 text-sm text-content-secondary">{acc.currency}</td>
      <td className="px-4 py-3 text-right tabular-nums text-sm">
        {acc.balance > 0 ? (
          <span className="font-semibold text-content-primary">
            {formatAmount(acc.balance, acc.currency)}
          </span>
        ) : (
          <span className="text-content-quaternary font-normal">—</span>
        )}
      </td>
    </tr>
  )
}

