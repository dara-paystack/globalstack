import { useState, useEffect } from 'react'
import { Skeleton, Alert, AlertDescription, AlertWarningIcon } from '@paystack/pax'
import { Badge } from '../components/ui/Badge'
import { ErrorState } from '../components/ui/ErrorState'
import { AddEndpointModal } from '../components/ui/AddEndpointModal'
import { usePanelContext } from '../context/PanelContext'
import { formatRelative } from '../lib/format'

export default function Webhooks() {
  const [webhooks, setWebhooks] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [showAddModal, setShowAddModal] = useState(false)

  const { openPanel, panelState } = usePanelContext()

  async function loadWebhooks() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/webhooks')
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const json = await res.json()
      setWebhooks(json.data)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadWebhooks()
  }, [])

  async function handleDelete(id) {
    try {
      await fetch(`/api/webhooks/${id}`, { method: 'DELETE' })
      setWebhooks((prev) => prev.filter((w) => w.id !== id))
    } catch {
      // Silent fail in prototype — real app would show toast
    }
  }

  // Aggregate failure count and find the first failing endpoint for the "View details" link.
  // Computed from loaded webhooks — not derived inside the map so it stays available even
  // when the Add Endpoint form is open and the endpoint rows are visually below the form.
  const totalFailed = webhooks.reduce((sum, wh) => sum + (wh.deliverySummary?.failed ?? 0), 0)
  const firstFailingWebhook = webhooks.find((wh) => (wh.deliverySummary?.failed ?? 0) > 0)

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold text-content-primary leading-snug">Webhooks</h1>

      {/* Page-level failure banner — sits above the card so it stays visible even when the
          Add Endpoint form is open. A single banner covers all failing endpoints rather than
          one per row: operators need to know something is wrong, not read it twice. */}
      {totalFailed > 0 && firstFailingWebhook && (
        <Alert severity="warning" variant="filled">
          <AlertWarningIcon />
          <AlertDescription className="flex items-center justify-between gap-4">
            <span>
              {totalFailed} {totalFailed === 1 ? 'delivery' : 'deliveries'} failed in the last 24 hours.
            </span>
            <button
              onClick={() => openPanel('webhook', firstFailingWebhook.id)}
              className="shrink-0 font-medium hover:underline cursor-pointer"
            >
              View details
            </button>
          </AlertDescription>
        </Alert>
      )}

      <div className="bg-surface-primary border border-border-primary-light rounded-xl overflow-hidden">
        {/* Card header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-border-primary-light">
          <h2 className="text-xs font-medium uppercase tracking-wide text-content-tertiary">
            Endpoints
          </h2>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-action-primary-main text-content-inverse text-sm font-medium hover:bg-action-primary-dark transition-colors cursor-pointer"
          >
            <span className="text-base leading-none">+</span>
            Add endpoint
          </button>
        </div>

        {/* Endpoint table */}
        <table className="w-full">
          <thead>
            <tr className="border-b border-border-primary-light bg-surface-secondary">
              <th className="px-4 py-2.5 text-left text-xs font-medium text-content-tertiary">Endpoint</th>
              <th className="px-4 py-2.5 text-left text-xs font-medium text-content-tertiary">Status</th>
              <th className="px-4 py-2.5 text-left text-xs font-medium text-content-tertiary">Events</th>
              <th className="px-4 py-2.5 text-left text-xs font-medium text-content-tertiary">Deliveries</th>
              <th className="px-4 py-2.5" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border-primary-light">
            {error ? (
              <tr>
                <td colSpan={5} className="px-4 py-12 text-center">
                  <ErrorState message={error} onRetry={loadWebhooks} />
                </td>
              </tr>
            ) : loading ? (
              Array.from({ length: 2 }).map((_, i) => (
                <tr key={i}>
                  <td className="px-4 py-3"><Skeleton className="h-4 w-56" /></td>
                  <td className="px-4 py-3"><Skeleton className="h-5 w-14 rounded-full" /></td>
                  <td className="px-4 py-3"><Skeleton className="h-4 w-40" /></td>
                  <td className="px-4 py-3">
                    <Skeleton className="h-4 w-8" />
                    <Skeleton className="h-3 w-24 mt-1" />
                  </td>
                  <td className="px-4 py-3" />
                </tr>
              ))
            ) : (
              webhooks.map((wh) => {
                const summary = wh.deliverySummary ?? { total: 0, failed: 0, lastAt: null }
                const isSelected = panelState.type === 'webhook' && panelState.id === wh.id

                return (
                  <tr
                    key={wh.id}
                    onClick={() => openPanel('webhook', wh.id)}
                    className={[
                      'cursor-pointer transition-colors',
                      isSelected ? 'bg-surface-secondary' : 'hover:bg-surface-secondary',
                    ].join(' ')}
                  >
                    {/* Endpoint URL */}
                    <td className="px-4 py-3">
                      <div className="font-mono text-sm text-content-primary truncate max-w-[260px]">
                        {wh.url}
                      </div>
                    </td>

                    {/* Status */}
                    <td className="px-4 py-3">
                      <Badge variant="status" value={wh.status} />
                    </td>

                    {/* Subscribed events */}
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {wh.events.map((event) => (
                          <span
                            key={event}
                            className="inline-flex items-center px-1.5 py-0.5 rounded-sm text-xs font-medium bg-surface-tertiary text-content-secondary"
                          >
                            {event}
                          </span>
                        ))}
                      </div>
                    </td>

                    {/* Deliveries + last delivery beneath */}
                    <td className="px-4 py-3">
                      <div className="text-sm text-content-primary tabular-nums">
                        {summary.total}
                        {summary.failed > 0 && (
                          <span className="text-feedback-danger-main font-medium ml-1.5">
                            · {summary.failed} failed
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-content-tertiary mt-0.5 whitespace-nowrap">
                        {summary.lastAt ? `Last ${formatRelative(summary.lastAt)}` : 'No deliveries yet'}
                      </div>
                    </td>

                    {/* Actions — stopPropagation so clicks don't open the panel */}
                    <td
                      className="px-4 py-3 text-right whitespace-nowrap"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button className="text-sm text-content-tertiary hover:text-content-primary cursor-pointer transition-colors">
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(wh.id)}
                        className="text-sm text-feedback-danger-main hover:text-feedback-danger-dark cursor-pointer transition-colors ml-3"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      {showAddModal && (
        <AddEndpointModal
          onClose={() => setShowAddModal(false)}
          onSuccess={loadWebhooks}
        />
      )}
    </div>
  )
}
