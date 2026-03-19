// Recipients page — /recipients
//
// Shows all saved payout destinations across all customers.
// Operators use this to audit "where can my customers send money?"
// and verify that saved bank accounts / wallet addresses are correct.
//
// Filter bar: Customer / Type / Status (via universal PageHeader filter panel)
// Table: Name · Customer · Destination · Rail · Status · Created
// Row click → GlobalPanel (type='recipient')
//
// "Add recipient" is UI-only. Recipient creation requires a bank resolution
// flow (verifying account numbers, routing numbers, and ownership) which is
// a separate integration — not a simple form. Coming soon placeholder keeps
// the intent visible without shipping an incomplete flow.

import { useState, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { usePageTitle } from '../lib/usePageTitle'
import {
  Skeleton,
  Pagination, PaginationContent, PaginationItem, PaginationPrevious, PaginationNext,
} from '@paystack/pax'
import { useRecipients } from '../hooks/useRecipients'
import { useCustomers } from '../hooks/useCustomers'
import { usePanelContext } from '../context/PanelContext'
import { useSearch } from '../context/SearchContext'
import { Badge } from '../components/ui/Badge'
import { PageHeader } from '../components/ui/PageHeader'
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
  // 'all' is the Radix sentinel for "no filter selected" — same pattern as Transactions.
  // Converted to '' when building the API request via fromSelect().
  const [customerFilter, setCustomerFilter] = useState('all')
  const [typeFilter, setTypeFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [page, setPage] = useState(1)
  const [showComingSoon, setShowComingSoon] = useState(false)

  const { panelState, openPanel } = usePanelContext()
  const { addRecentItem } = useSearch()
  const location = useLocation()
  const { data: customers } = useCustomers()

  // Open recipient panel from search navigation (openRecipientId in router state)
  useEffect(() => {
    const id = location.state?.openRecipientId
    if (id) openPanel('recipient', id)
  }, [location.state?.openRecipientId]) // eslint-disable-line react-hooks/exhaustive-deps

  function fromSelect(val) {
    return val === 'all' ? '' : val
  }

  const { data: recipients, meta, loading, error } = useRecipients({
    customerId: fromSelect(customerFilter),
    type: fromSelect(typeFilter),
    status: fromSelect(statusFilter),
    page,
    limit: 15,
  })

  const hasActiveFilters = fromSelect(customerFilter) || fromSelect(typeFilter) || fromSelect(statusFilter)

  // Filter change helpers — also reset to page 1 on each apply
  function applyCustomer(val) { setCustomerFilter(val); setPage(1) }
  function applyType(val) { setTypeFilter(val); setPage(1) }
  function applyStatus(val) { setStatusFilter(val); setPage(1) }

  function clearFilters() {
    setCustomerFilter('all')
    setTypeFilter('all')
    setStatusFilter('all')
    setPage(1)
  }

  function handleAddRecipient() {
    // Recipient creation requires bank resolution flow (verify account number,
    // routing number ownership) — not a simple form. Showing coming soon.
    setShowComingSoon(true)
    setTimeout(() => setShowComingSoon(false), 3000)
  }

  const isPanelOpen = !!panelState.type

  // Build customer options for the Customer filter — dynamic from loaded customers list
  const customerOptions = [
    { value: 'all', label: 'All customers' },
    ...customers.map((c) => ({ value: c.id, label: c.name })),
  ]

  // Filter definitions for PageHeader
  const filters = [
    {
      id: 'customer',
      label: 'Customer',
      options: customerOptions,
      value: customerFilter,
      defaultValue: 'all',
      onChange: applyCustomer,
    },
    {
      id: 'type',
      label: 'Type',
      options: [
        { value: 'all', label: 'All types' },
        { value: 'fiat', label: 'Bank account' },
        { value: 'crypto', label: 'Crypto wallet' },
      ],
      value: typeFilter,
      defaultValue: 'all',
      onChange: applyType,
    },
    {
      id: 'status',
      label: 'Status',
      options: [
        { value: 'all', label: 'All statuses' },
        { value: 'active', label: 'Active' },
        { value: 'archived', label: 'Archived' },
      ],
      value: statusFilter,
      defaultValue: 'all',
      onChange: applyStatus,
    },
  ]

  return (
    <div className="space-y-8">
      <PageHeader
        title="Recipients"
        subtitle="Saved payout destinations for your customers."
        filters={filters}
        primaryAction={{ label: '+ Add recipient', onClick: handleAddRecipient }}
      />

      {/* Table */}
      <div className="bg-surface-primary border border-border-primary-light rounded-xl overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border-primary-light bg-surface-secondary">
              {/* Mobile: Name + Destination only. Customer, Rail, Status, Created hidden. */}
              <th className="px-4 py-2.5 text-left text-xs font-medium text-content-tertiary">
                Name
              </th>
              {!isPanelOpen && (
                <th className="px-4 py-2.5 text-left text-xs font-medium text-content-tertiary hidden md:table-cell">
                  Customer
                </th>
              )}
              <th className="px-4 py-2.5 text-left text-xs font-medium text-content-tertiary">
                Destination
              </th>
              <th className="px-4 py-2.5 text-left text-xs font-medium text-content-tertiary hidden md:table-cell">
                Rail
              </th>
              <th className="px-4 py-2.5 text-left text-xs font-medium text-content-tertiary hidden md:table-cell">
                Status
              </th>
              <th className="px-4 py-2.5 text-left text-xs font-medium text-content-tertiary hidden md:table-cell">
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
                    onClick={() => { openPanel('recipient', recipient.id); addRecentItem('recipient', recipient.id) }}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openPanel('recipient', recipient.id); addRecentItem('recipient', recipient.id) } }}
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

                    {/* Customer — hidden on mobile AND when panel is open */}
                    {!isPanelOpen && (
                      <td className="px-4 py-3 text-sm text-content-primary hidden md:table-cell">
                        {customer?.name ?? '—'}
                      </td>
                    )}

                    {/* Destination — always visible */}
                    <td className="px-4 py-3">
                      <DestinationCell recipient={recipient} />
                    </td>

                    {/* Rail — hidden on mobile */}
                    <td className="px-4 py-3 text-sm text-content-secondary hidden md:table-cell">
                      {RAIL_LABELS[recipient.rail] ?? recipient.rail}
                    </td>

                    {/* Status — hidden on mobile */}
                    <td className="px-4 py-3 hidden md:table-cell">
                      <Badge variant="status" value={recipient.status} />
                    </td>

                    {/* Created — hidden on mobile */}
                    <td className="px-4 py-3 text-sm text-content-tertiary whitespace-nowrap hidden md:table-cell">
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
