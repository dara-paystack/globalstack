// Recipients page — /recipients
//
// Shows all saved payout destinations across all customers.
// Operators use this to audit "where can my customers send money?"
// and verify that saved bank accounts / wallet addresses are correct.
//
// Filter bar: Customer / Type / Status
// Table: Name · Customer · Destination · Rail · Status · Created
// Row click → GlobalPanel (type='recipient')
//
// "Add recipient" is UI-only. Recipient creation requires a bank resolution
// flow (verifying account numbers, routing numbers, and ownership) which is
// a separate integration — not a simple form. Coming soon placeholder keeps
// the intent visible without shipping an incomplete flow.

import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { usePageTitle } from '../lib/usePageTitle'
import {
  Skeleton,
  Pagination, PaginationContent, PaginationItem, PaginationPrevious, PaginationNext,
} from '@paystack/pax'
import { useRecipients } from '../hooks/useRecipients'
import { useCustomers } from '../hooks/useCustomers'
import { usePanelContext } from '../context/PanelContext'
import { Badge } from '../components/ui/Badge'
import { formatDate } from '../lib/format'

const RAIL_LABELS = {
  ach:          'ACH',
  ach_same_day: 'ACH Same-day',
  wire:         'Wire',
  solana:       'Solana',
  ethereum:     'Ethereum',
  base:         'Base',
}

const CHAIN_LABELS = {
  base:     'Base',
  solana:   'Solana',
  ethereum: 'Ethereum',
}

// Truncate a crypto wallet address: first 6 + … + last 4
function truncateAddress(addr) {
  if (!addr || addr.length <= 14) return addr
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`
}

function DestinationCell({ recipient }) {
  if (recipient.type === 'fiat') {
    return (
      <div>
        <div className="text-sm text-content-primary">{recipient.bankName}</div>
        <div className="text-xs text-content-tertiary font-mono mt-0.5">
          {recipient.accountNumberMasked}
        </div>
      </div>
    )
  }
  return (
    <div>
      <div className="text-sm text-content-primary">
        {CHAIN_LABELS[recipient.chain] ?? recipient.chain}
      </div>
      <div className="text-xs text-content-tertiary font-mono mt-0.5 truncate max-w-[180px]">
        {truncateAddress(recipient.walletAddress)}
      </div>
    </div>
  )
}

// Toast for "coming soon" actions — appears inline, auto-dismisses after 3s.
// Used for Add recipient (requires bank resolution flow not yet implemented).
function ComingSoonToast({ visible }) {
  if (!visible) return null
  return (
    <div className="fixed bottom-6 right-6 z-50 bg-content-primary text-content-inverse text-sm px-4 py-2.5 rounded-lg shadow-lg transition-opacity">
      Coming soon — recipient creation requires a bank resolution flow.
    </div>
  )
}

export default function Recipients() {
  usePageTitle('Recipients')
  const [customerFilter, setCustomerFilter] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [page, setPage] = useState(1)
  const [showComingSoon, setShowComingSoon] = useState(false)

  const { panelState, openPanel } = usePanelContext()
  const { data: customers } = useCustomers()

  const { data: recipients, meta, loading, error } = useRecipients({
    customerId: customerFilter,
    type: typeFilter,
    status: statusFilter,
    page,
    limit: 15,
  })

  const hasActiveFilters = customerFilter || typeFilter || statusFilter

  function handleFilterChange(setter) {
    return (e) => {
      setter(e.target.value)
      setPage(1)
    }
  }

  function clearFilters() {
    setCustomerFilter('')
    setTypeFilter('')
    setStatusFilter('')
    setPage(1)
  }

  function handleAddRecipient() {
    // Recipient creation requires bank resolution flow (verify account number,
    // routing number ownership) — not a simple form. Showing coming soon.
    setShowComingSoon(true)
    setTimeout(() => setShowComingSoon(false), 3000)
  }

  const isPanelOpen = !!panelState.type

  // Filter dropdown base classes — consistent with Transactions filter bar style
  const selectBase =
    'h-8 px-2.5 pr-7 text-sm rounded-lg border border-border-primary-main bg-surface-primary text-content-secondary appearance-none cursor-pointer hover:border-border-primary-dark focus:outline-none focus:ring-1 focus:ring-action-primary-main transition-colors'

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-semibold text-content-primary leading-snug">
          Recipients
        </h1>
        <p className="text-sm text-content-tertiary mt-1">
          Saved payout destinations for your customers.
        </p>
      </div>

      {/* Filter bar */}
      <div className="flex items-center gap-2 flex-wrap">
        {/* Customer filter */}
        <div className="relative">
          <select
            value={customerFilter}
            onChange={handleFilterChange(setCustomerFilter)}
            className={selectBase}
          >
            <option value="">All customers</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-content-tertiary" width={10} height={10} strokeWidth={1.25} />
        </div>

        {/* Type filter */}
        <div className="relative">
          <select
            value={typeFilter}
            onChange={handleFilterChange(setTypeFilter)}
            className={selectBase}
          >
            <option value="">All types</option>
            <option value="fiat">Bank account</option>
            <option value="crypto">Crypto wallet</option>
          </select>
          <ChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-content-tertiary" width={10} height={10} strokeWidth={1.25} />
        </div>

        {/* Status filter */}
        <div className="relative">
          <select
            value={statusFilter}
            onChange={handleFilterChange(setStatusFilter)}
            className={selectBase}
          >
            <option value="">All statuses</option>
            <option value="active">Active</option>
            <option value="archived">Archived</option>
          </select>
          <ChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-content-tertiary" width={10} height={10} strokeWidth={1.25} />
        </div>

        {hasActiveFilters && (
          <button
            onClick={clearFilters}
            className="h-8 px-2.5 text-sm text-content-tertiary hover:text-content-primary cursor-pointer transition-colors"
          >
            Clear filters
          </button>
        )}

        {/* Add recipient — right-aligned */}
        <div className="ml-auto">
          <button
            onClick={handleAddRecipient}
            className="h-8 px-3 text-sm font-medium rounded-lg border border-border-primary-main text-content-secondary hover:text-content-primary hover:bg-surface-secondary transition-colors cursor-pointer flex items-center gap-1.5"
          >
            <span>+</span>
            Add recipient
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-surface-primary border border-border-primary-light rounded-xl overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border-primary-light bg-surface-secondary">
              <th className="px-4 py-2.5 text-left text-xs font-medium text-content-tertiary">
                Name
              </th>
              {!isPanelOpen && (
                <th className="px-4 py-2.5 text-left text-xs font-medium text-content-tertiary">
                  Customer
                </th>
              )}
              <th className="px-4 py-2.5 text-left text-xs font-medium text-content-tertiary">
                Destination
              </th>
              <th className="px-4 py-2.5 text-left text-xs font-medium text-content-tertiary">
                Rail
              </th>
              <th className="px-4 py-2.5 text-left text-xs font-medium text-content-tertiary">
                Status
              </th>
              <th className="px-4 py-2.5 text-left text-xs font-medium text-content-tertiary">
                Created
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border-primary-light">
            {loading ? (
              Array.from({ length: 8 }).map((_, i) => (
                <tr key={i}>
                  <td className="px-4 py-3">
                    <Skeleton className="h-4 w-40" />
                    <Skeleton className="h-3 w-20 mt-1" />
                  </td>
                  {!isPanelOpen && (
                    <td className="px-4 py-3">
                      <Skeleton className="h-4 w-28" />
                    </td>
                  )}
                  <td className="px-4 py-3">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-24 mt-1" />
                  </td>
                  <td className="px-4 py-3"><Skeleton className="h-4 w-14" /></td>
                  <td className="px-4 py-3"><Skeleton className="h-5 w-14 rounded-full" /></td>
                  <td className="px-4 py-3"><Skeleton className="h-4 w-20" /></td>
                </tr>
              ))
            ) : error ? (
              <tr>
                <td colSpan={isPanelOpen ? 5 : 6} className="px-4 py-12 text-center">
                  <p className="text-sm text-feedback-danger-main">Failed to load recipients.</p>
                </td>
              </tr>
            ) : recipients.length === 0 ? (
              <tr>
                <td colSpan={isPanelOpen ? 5 : 6} className="px-4 py-12 text-center">
                  <p className="text-sm text-content-tertiary">No recipients found.</p>
                  {hasActiveFilters && (
                    <button
                      onClick={clearFilters}
                      className="text-sm link mt-2 cursor-pointer"
                    >
                      Clear filters
                    </button>
                  )}
                </td>
              </tr>
            ) : (
              recipients.map((recipient) => {
                // Look up customer name from the customers list
                const customer = customers.find((c) => c.id === recipient.customerId)
                const isActive = panelState.type === 'recipient' && panelState.id === recipient.id

                return (
                  <tr
                    key={recipient.id}
                    onClick={() => openPanel('recipient', recipient.id)}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openPanel('recipient', recipient.id) } }}
                    tabIndex={0}
                    className={[
                      'cursor-pointer transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-action-primary-main focus-visible:ring-inset',
                      isActive ? 'bg-surface-secondary' : 'hover:bg-surface-secondary',
                    ].join(' ')}
                  >
                    {/* Name + type label */}
                    <td className="px-4 py-3">
                      <div className="text-sm font-medium text-content-primary leading-snug">
                        {recipient.name}
                      </div>
                      <div className="text-xs text-content-tertiary mt-0.5">
                        {recipient.type === 'fiat' ? 'Bank account' : 'Crypto wallet'}
                      </div>
                    </td>

                    {/* Customer — hidden when panel is open (col too wide) */}
                    {!isPanelOpen && (
                      <td className="px-4 py-3 text-sm text-content-primary">
                        {customer?.name ?? '—'}
                      </td>
                    )}

                    {/* Destination */}
                    <td className="px-4 py-3">
                      <DestinationCell recipient={recipient} />
                    </td>

                    {/* Rail */}
                    <td className="px-4 py-3 text-sm text-content-secondary">
                      {RAIL_LABELS[recipient.rail] ?? recipient.rail}
                    </td>

                    {/* Status */}
                    <td className="px-4 py-3">
                      <Badge variant="status" value={recipient.status}>
                        {recipient.status === 'active' ? 'Active' : 'Archived'}
                      </Badge>
                    </td>

                    {/* Created */}
                    <td className="px-4 py-3 text-sm text-content-tertiary whitespace-nowrap">
                      {formatDate(recipient.createdAt)}
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>

        {/* Pagination */}
        {meta && meta.totalPages > 1 && (
          <div className="border-t border-border-primary-light px-4 py-2">
            <Pagination>
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious
                    onClick={() => setPage(page - 1)}
                    disabled={page <= 1}
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
      </div>

      <ComingSoonToast visible={showComingSoon} />
    </div>
  )
}
