import { useState, useEffect, useCallback } from 'react'
import { useLocation } from 'react-router-dom'
import { usePageTitle } from '../lib/usePageTitle'
import { Skeleton } from '@paystack/pax'
import { useCustomers } from '../hooks/useCustomers'
import { usePanelContext } from '../context/PanelContext'
import { useSearch } from '../context/SearchContext'
import { Badge } from '../components/ui/Badge'
import { PageHeader } from '../components/ui/PageHeader'
import { ErrorState } from '../components/ui/ErrorState'
import { formatUSDC, formatDate } from '../lib/format'

const COUNTRY_NAMES = {
  NG: 'Nigeria',
  KE: 'Kenya',
  ZA: 'South Africa',
  GH: 'Ghana',
}

// Grouped KYC filter — mirrors the 9-state model from the API.
// Groups reflect the operator action required, not just alphabetical order:
//   Active    — can transact; no action needed
//   Incomplete — need operator nudge to share KYC link
//   Blocked   — cannot transact; compliance action required
const KYC_FILTER_OPTIONS = [
  { value: 'all',                    label: 'All statuses',            group: null },
  { value: '_g_active',              label: 'Active',                  group: 'separator' },
  { value: 'active',                 label: 'Approved',                group: 'active' },
  { value: 'under_review',          label: 'Under review',            group: 'active' },
  { value: '_g_incomplete',         label: 'Incomplete',              group: 'separator' },
  { value: 'not_started',           label: 'Not started',             group: 'incomplete' },
  { value: 'incomplete',            label: 'Incomplete',              group: 'incomplete' },
  { value: 'awaiting_questionnaire', label: 'Awaiting questionnaire',  group: 'incomplete' },
  { value: 'awaiting_ubo',          label: 'Awaiting UBO',           group: 'incomplete' },
  { value: '_g_blocked',            label: 'Blocked',                 group: 'separator' },
  { value: 'rejected',              label: 'Rejected',                group: 'blocked' },
  { value: 'paused',                label: 'Paused',                  group: 'blocked' },
  { value: 'offboarded',            label: 'Offboarded',              group: 'blocked' },
]

function fromKycSelect(val) {
  if (val === 'all' || val?.startsWith('_')) return ''
  return val
}

export default function Customers() {
  usePageTitle('Customers')
  const [kycFilter, setKycFilter] = useState('all')
  const { data: customers, loading, error, refetch } = useCustomers({
    kycStatus: fromKycSelect(kycFilter),
  })
  const { panelState, openPanel } = usePanelContext()
  const { addRecentItem } = useSearch()
  const location = useLocation()

  // Open a specific customer's panel when arriving via a customer link
  // from another page (e.g. the Customer column in the Accounts table).
  useEffect(() => {
    const id = location.state?.openCustomerId
    if (id) {
      openPanel('customer', id)
    }
  }, [location.state?.openCustomerId]) // eslint-disable-line react-hooks/exhaustive-deps

  const applyKycFilter = useCallback((value) => {
    setKycFilter(value)
  }, [])

  // Hide Created column when panel is open — recoverable in the panel's Profile section.
  const panelOpen = panelState.type === 'customer'
  const filtersActive = fromKycSelect(kycFilter) !== ''

  const filters = [
    {
      id: 'kycStatus',
      label: 'KYC Status',
      options: KYC_FILTER_OPTIONS,
      value: kycFilter,
      defaultValue: 'all',
      onChange: applyKycFilter,
    },
  ]

  return (
    <div className="space-y-8">
      <PageHeader
        title="Customers"
        subtitle="Manage your customers and their KYC status."
        filters={filters}
      />

      <div className="bg-surface-primary border border-border-primary-light rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          {error ? (
            <ErrorState message={error} onRetry={refetch} />
          ) : loading ? (
            <div className="divide-y divide-border-primary-light">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4 px-4 py-3">
                  <Skeleton className="h-4 w-36" />
                  <Skeleton className="h-5 w-16 rounded-full" />
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-5 w-16 rounded-full ml-auto" />
                  <Skeleton className="h-4 w-24" />
                  {!panelOpen && <Skeleton className="h-4 w-24" />}
                </div>
              ))}
            </div>
          ) : customers.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-sm text-content-tertiary">
                {filtersActive ? 'No customers match this KYC status.' : 'No customers yet.'}
              </p>
              {filtersActive && (
                <button onClick={() => applyKycFilter('all')} className="mt-3 text-sm text-action-primary-main hover:text-action-primary-dark cursor-pointer">
                  Clear filter
                </button>
              )}
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-border-primary-light bg-surface-secondary">
                  {/* Mobile: Name + KYC Status + Balance. Type, Country, Created hidden. */}
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-content-tertiary">
                    Name
                  </th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-content-tertiary hidden md:table-cell">
                    Type
                  </th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-content-tertiary hidden md:table-cell">
                    Country
                  </th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-content-tertiary">
                    KYC Status
                  </th>
                  <th className="px-4 py-2.5 text-right text-xs font-medium text-content-tertiary">
                    Balance
                  </th>
                  {/* Created hidden on mobile AND when panel open */}
                  {!panelOpen && (
                    <th className="px-4 py-2.5 text-right text-xs font-medium text-content-tertiary hidden md:table-cell">
                      Created
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-border-primary-light">
                {customers.map((customer) => {
                  const isSelected =
                    panelState.type === 'customer' && panelState.id === customer.id
                  return (
                    <tr
                      key={customer.id}
                      onClick={() => { openPanel('customer', customer.id); addRecentItem('customer', customer.id) }}
                      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openPanel('customer', customer.id); addRecentItem('customer', customer.id) } }}
                      tabIndex={0}
                      className={[
                        'cursor-pointer transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-action-primary-main focus-visible:ring-inset',
                        isSelected ? 'bg-surface-secondary' : 'hover:bg-surface-secondary',
                      ].join(' ')}
                    >
                      <td className="px-4 py-3">
                        <div className="text-sm font-medium text-content-primary">
                          {customer.name}
                        </div>
                        <div className="text-xs text-content-tertiary mt-0.5 font-mono">
                          {customer.id}
                        </div>
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell">
                        <Badge variant="type" value={customer.type} />
                      </td>
                      <td className="px-4 py-3 text-sm text-content-secondary hidden md:table-cell">
                        {COUNTRY_NAMES[customer.country] ?? customer.country}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant="status" value={customer.kycStatus} context="kyc" />
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums text-sm font-medium text-content-primary">
                        {customer.balance > 0
                          ? formatUSDC(customer.balance)
                          : <span className="text-content-quaternary font-normal">—</span>}
                      </td>
                      {!panelOpen && (
                        <td className="px-4 py-3 text-right text-sm text-content-tertiary whitespace-nowrap hidden md:table-cell">
                          {formatDate(customer.createdAt)}
                        </td>
                      )}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}
