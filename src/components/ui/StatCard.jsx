// StatCard — balance/metric card used on the Overview page.
// Pax's Skeleton component is used for the loading state.
import { Skeleton } from '@paystack/pax'

export function StatCard({ label, value, subvalue, trend, loading, children }) {
  if (loading) {
    return (
      <div className="bg-surface-primary border border-border-primary-light rounded-xl p-5">
        <Skeleton className="h-4 w-24 mb-4" />
        <Skeleton className="h-8 w-40 mb-2" />
        <Skeleton className="h-3 w-20" />
      </div>
    )
  }

  const trendPositive = trend >= 0

  return (
    <div className="bg-surface-primary border border-border-primary-light rounded-xl p-5">
      <div className="text-xs font-medium text-content-tertiary uppercase tracking-wide mb-3">
        {label}
      </div>
      <div className="text-2xl font-semibold text-content-primary tabular-nums">{value}</div>
      {subvalue && (
        <div className="text-sm text-content-tertiary mt-0.5">{subvalue}</div>
      )}
      {trend !== undefined && (
        <div
          className={[
            'text-xs font-medium mt-2',
            trendPositive ? 'text-feedback-success-main' : 'text-feedback-danger-main',
          ].join(' ')}
        >
          {trendPositive ? '+' : ''}{trend.toFixed(1)}% vs last 7 days
        </div>
      )}
      {children}
    </div>
  )
}
