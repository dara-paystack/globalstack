import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { usePageTitle } from '../lib/usePageTitle'
import {
  Skeleton, Button, TextInput,
  Pagination, PaginationContent, PaginationItem, PaginationPrevious, PaginationNext,
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from '@paystack/pax'
import { Filter, X } from 'lucide-react'
import { useAccounts, useCustomerAccounts } from '../hooks/useAccounts'
import { usePanelContext } from '../context/PanelContext'
import { useSearch } from '../context/SearchContext'
import { Badge } from '../components/ui/Badge'
import { ErrorState } from '../components/ui/ErrorState'
import { EmptyState } from '../components/ui/EmptyState'
import { formatUSDC, formatAmount } from '../lib/format'

// ─── SectionFilter — Filter button + panel for the Customer Accounts section ──
//
// Same visual pattern as PageHeader's filter button, scoped to the section.
// Single filter (Type: All / On-chain / Fiat) with deferred Apply.
// Inline rather than reusing PageHeader because this is a section-level control,
// not a page-level header — it renders inside the page body, not as the heading.
//
// The Radix click-outside fix applies here too: skip [data-radix-popper-content-wrapper]
// so clicking a Select option inside the panel doesn't close it prematurely.
// toSentinel / fromSentinel: Radix forbids value="" on SelectItem (reserved for
// "no selection"). Internally the panel uses 'all' as the "no filter" sentinel,
// identical to the pattern in Transactions, Customers, Recipients, etc.
function toSentinel(val) { return val === '' ? 'all' : val }
function fromSentinel(val) { return val === 'all' ? '' : val }

function SectionFilter({ typeFilter, onApply }) {
  const [open, setOpen] = useState(false)
  const [pending, setPending] = useState(toSentinel(typeFilter))
  const ref = useRef(null)

  const isActive = typeFilter !== ''

  function openPanel() {
    setPending(toSentinel(typeFilter))
    setOpen(true)
  }

  function handleApply() {
    onApply(fromSentinel(pending))
    setOpen(false)
  }

  function handleClearAll() {
    setPending('all')
  }

  useEffect(() => {
    if (!open) return
    function handleMouseDown(e) {
      if (!ref.current) return
      if (ref.current.contains(e.target)) return
      if (e.target.closest('[data-radix-popper-content-wrapper]')) return
      setOpen(false)
    }
    document.addEventListener('mousedown', handleMouseDown)
    return () => document.removeEventListener('mousedown', handleMouseDown)
  }, [open])

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={open ? () => setOpen(false) : openPanel}
        aria-haspopup="true"
        aria-expanded={open}
        className={[
          'flex items-center gap-1.5 h-9 px-3 rounded-lg border text-sm font-medium transition-colors cursor-pointer',
          isActive
            ? 'border-action-primary-main bg-action-primary-light text-action-primary-main'
            : 'border-border-primary-main bg-surface-primary text-content-secondary hover:bg-surface-secondary hover:text-content-primary',
        ].join(' ')}
      >
        <Filter width={14} height={14} strokeWidth={2} />
        Filter
        {isActive && (
          <span className="ml-0.5 min-w-[18px] h-[18px] flex items-center justify-center rounded-full bg-action-primary-main text-content-inverse text-xs font-semibold px-1 leading-none">
            1
          </span>
        )}
      </button>

      {open && (
        <div
          className="absolute right-0 top-full mt-1.5 w-[220px] bg-surface-primary border border-border-primary-light rounded-xl z-50"
          style={{ boxShadow: '0 4px 16px rgba(0,0,0,0.10)' }}
        >
          <div className="px-4 py-3 border-b border-border-primary-light">
            <span className="text-sm font-medium text-content-primary">Filters</span>
          </div>
          <div className="px-4 py-3">
            <label className="block text-xs font-medium text-content-tertiary mb-1.5">Type</label>
            <Select value={pending} onValueChange={setPending}>
              <SelectTrigger className="w-full text-sm cursor-pointer">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All types</SelectItem>
                <SelectItem value="on-chain">On-chain</SelectItem>
                <SelectItem value="fiat">Fiat</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center justify-between px-4 py-3 border-t border-border-primary-light">
            <button
              onClick={handleClearAll}
              className="text-sm text-action-primary-main hover:text-action-primary-dark font-medium cursor-pointer"
            >
              Clear all
            </button>
            <Button variant="default" color="primary" size="sm" onClick={handleApply} className="cursor-pointer">
              Apply
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Sort indicator arrow ─────────────────────────────────────────────────────
function SortArrow({ direction }) {
  return (
    <span className="ml-1 text-content-tertiary select-none">
      {direction === 'asc' ? '↑' : '↓'}
    </span>
  )
}

export default function Accounts() {
  usePageTitle('Accounts')
  // ── Banner stats: fetch all accounts once, compute aggregate client-side ──
  // Fetching all ~36 accounts for stats is fine at prototype scale.
  // In production you'd add a /api/accounts/summary endpoint returning
  // pre-computed totals rather than transferring all records to the client.
  const { data: allAccounts, loading: statsLoading, error: statsError, refetch: refetchStats } =
    useAccounts()
  const { panelState, openPanel } = usePanelContext()
  const { addRecentItem } = useSearch()
  const location = useLocation()

  // Open account panel from search navigation (openAccountId in router state)
  useEffect(() => {
    const id = location.state?.openAccountId
    if (id) openPanel('account', id)
  }, [location.state?.openAccountId]) // eslint-disable-line react-hooks/exhaustive-deps

  // Unified panel opener that also records to search recent history
  const handleOpenAccount = useCallback((type, id) => {
    openPanel(type, id)
    addRecentItem(type, id)
  }, [openPanel, addRecentItem])

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
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-content-primary leading-snug">Accounts</h1>
        <p className="text-sm text-content-tertiary mt-1">Your treasury and customer accounts.</p>
      </div>

      {/* ── Summary banner ────────────────────────────────────────────────── */}
      {statsLoading ? (
        <div className="bg-surface-primary border border-border-primary-light rounded-xl px-5 py-4 flex items-center gap-8">
          <div className="space-y-2">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-6 w-40" />
          </div>
          <div className="w-px bg-border-primary-light" />
          <div className="space-y-2">
            <Skeleton className="h-3 w-28" />
            <Skeleton className="h-6 w-40" />
            <Skeleton className="h-3 w-32" />
          </div>
          <div className="w-px bg-border-primary-light" />
          <div className="space-y-2">
            <Skeleton className="h-3 w-28" />
            <Skeleton className="h-6 w-36" />
            <Skeleton className="h-3 w-24" />
          </div>
        </div>
      ) : statsError ? null : (<>
        {/* Banner: mobile stacks vertically (flex-col), tablet/desktop is horizontal (md:flex-row).
            Dividers: horizontal (h-px) on mobile, vertical (md:w-px md:h-auto) on desktop. */}
        <div className="bg-surface-primary border border-border-primary-light rounded-xl px-5 py-4 flex flex-col md:flex-row md:items-start gap-4 md:gap-8">
          {/* YOUR BALANCE */}
          <div>
            <div className="text-xs font-medium text-content-tertiary mb-2">Your balance</div>
            <div className="text-xl font-semibold text-content-primary tabular-nums leading-none">
              {formatUSDC(merchantUsdcTotal)}
            </div>
            {merchantAsOf && (
              <div className="text-xs text-content-tertiary mt-2">
                Last updated: {new Intl.DateTimeFormat('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }).format(new Date(merchantAsOf))}
              </div>
            )}
          </div>

          <div className="h-px md:h-auto md:w-px bg-border-primary-light flex-shrink-0" />

          {/* UNDER MANAGEMENT */}
          <div>
            <div className="text-xs font-medium text-content-tertiary mb-2">Under management</div>
            <div className="text-xl font-semibold text-content-primary tabular-nums leading-none">
              {formatUSDC(customerUsdcTotal)}
            </div>
            <div className="text-xs text-content-tertiary mt-2">
              {customerAccountsAll.length} account{customerAccountsAll.length !== 1 ? 's' : ''} • {customerOwnerCount} customer{customerOwnerCount !== 1 ? 's' : ''}
            </div>
          </div>

          <div className="h-px md:h-auto md:w-px bg-border-primary-light flex-shrink-0" />

          {/* LARGEST ACCOUNT */}
          <div>
            <div className="text-xs font-medium text-content-tertiary mb-2">Largest account</div>
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
      </>)}

      {statsError && <ErrorState message={statsError} onRetry={refetchStats} />}

      {/* ── Section 1: Merchant accounts (unchanged) ──────────────────────── */}
      <div>
        <div className="px-1 mb-3">
          <span className="text-xs font-semibold uppercase tracking-widest text-content-tertiary">
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
              {/* Mobile: Account + Balance only. Type + Currency hidden (hidden md:table-cell). */}
              <thead>
                <tr className="border-b border-border-primary-light bg-surface-secondary">
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-content-tertiary">Account</th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-content-tertiary hidden md:table-cell">Type</th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-content-tertiary hidden md:table-cell">Currency</th>
                  <th className="px-4 py-2.5 text-right text-xs font-medium text-content-tertiary">Balance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-primary-light">
                {merchantAccounts.map((acc) => {
                  const isSelected = panelState.type === 'account' && panelState.id === acc.id
                  return (
                    <tr
                      key={acc.id}
                      onClick={() => handleOpenAccount('account', acc.id)}
                      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleOpenAccount('account', acc.id) } }}
                      tabIndex={0}
                      className={[
                        'cursor-pointer transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-action-primary-main focus-visible:ring-inset',
                        isSelected ? 'bg-surface-secondary' : 'hover:bg-surface-secondary',
                      ].join(' ')}
                    >
                      <td className="px-4 py-3">
                        <div className="text-sm font-medium text-content-primary">{acc.label}</div>
                        <div className="text-xs text-content-tertiary mt-0.5 font-mono">{acc.addressShort}</div>
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell">
                        <Badge variant="type" value={acc.type} />
                      </td>
                      <td className="px-4 py-3 text-sm text-content-secondary hidden md:table-cell">{acc.currency}</td>
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
          <span className="text-xs font-semibold uppercase tracking-widest text-content-tertiary">
            Customer accounts
          </span>
        </div>

        {/* Controls row: search left, Filter button right */}
        <div className="flex items-center gap-3 mb-3">
          <TextInput
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by account or customer…"
            className="h-9 w-64 text-sm"
          />
          <SectionFilter typeFilter={typeFilter} onApply={handleTypeFilter} />
        </div>

        {/* Active filter pill — same visual style as PageHeader active pills */}
        {typeFilter && (
          <div className="flex items-center gap-1.5 mb-3">
            <div className="flex items-center gap-1 pl-2.5 pr-1.5 py-1 text-xs font-medium rounded-full bg-action-primary-light border border-border-primary-light text-action-primary-main">
              <span>Type: {typeFilter === 'on-chain' ? 'On-chain' : 'Fiat'}</span>
              <button
                onClick={() => handleTypeFilter('')}
                className="ml-0.5 text-action-primary-main hover:text-action-primary-dark cursor-pointer leading-none"
                aria-label="Remove type filter"
              >
                <X width={11} height={11} strokeWidth={2.5} />
              </button>
            </div>
          </div>
        )}

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
                    {/* Type + Currency: hidden on mobile */}
                    <th className="px-4 py-2.5 text-left text-xs font-medium text-content-tertiary hidden md:table-cell">
                      Type
                    </th>
                    {/* Customer column hidden when account panel is open to reclaim space */}
                    {!panelOpen && (
                      <th className="px-4 py-2.5 text-left text-xs font-medium text-content-tertiary">
                        Customer
                      </th>
                    )}
                    <th className="px-4 py-2.5 text-left text-xs font-medium text-content-tertiary hidden md:table-cell">
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
                      onOpen={handleOpenAccount}
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
    navigate('/dashboard/customers', { state: { openCustomerId: acc.customerId } })
  }

  return (
    <tr
      onClick={() => onOpen('account', acc.id)}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpen('account', acc.id) } }}
      tabIndex={0}
      className={[
        'cursor-pointer transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-action-primary-main focus-visible:ring-inset',
        isSelected ? 'bg-surface-secondary' : 'hover:bg-surface-secondary',
      ].join(' ')}
    >
      <td className="px-4 py-3">
        <div className="text-sm font-medium text-content-primary">{acc.label}</div>
        <div className="text-xs text-content-tertiary mt-0.5 font-mono">{acc.addressShort}</div>
      </td>
      <td className="px-4 py-3 hidden md:table-cell">
        <Badge variant="type" value={acc.type} />
      </td>
      {!panelOpen && (
        <td className="px-4 py-3">
          <button
            onClick={handleCustomerClick}
            className="text-sm link text-left cursor-pointer"
          >
            {acc.customer}
          </button>
        </td>
      )}
      <td className="px-4 py-3 text-sm text-content-secondary hidden md:table-cell">{acc.currency}</td>
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

