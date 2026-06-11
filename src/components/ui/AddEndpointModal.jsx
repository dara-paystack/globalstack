// AddEndpointModal — single-step form to register a new webhook endpoint.
//
// Why a modal (not inline):
//   The inline form pushed the endpoint table down and mixed viewer state
//   (the list) with action state (the form) in the same visual container.
//   A modal is the right call: bounded task, completes in one step, returns
//   the user to exactly where they were. The endpoint list doesn't need to
//   be visible while filling in a URL — you already know what you want.
//
// Pattern: matches SendFundsModal exactly — backdrop + card, click outside
//   to dismiss, same header/body/footer structure, same token set.

import { useState } from 'react'
import { X } from 'lucide-react'
import { TextInput } from '@paystack/pax'

const ALL_EVENTS = ['CONVERSION', 'TRANSFER', 'INDEXED_DEPOSIT', 'KYC_UPDATE']

export function AddEndpointModal({ onClose, onSuccess }) {
  const [url, setUrl] = useState('')
  const [events, setEvents] = useState([])
  const [submitting, setSubmitting] = useState(false)

  function toggleEvent(event) {
    setEvents((prev) =>
      prev.includes(event) ? prev.filter((e) => e !== event) : [...prev, event],
    )
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!url || events.length === 0) return
    setSubmitting(true)
    try {
      await fetch('/api/webhooks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, events }),
      })
      onSuccess()
      onClose()
    } catch {
      // Silent fail in prototype
    } finally {
      setSubmitting(false)
    }
  }

  const canSubmit = url.length > 0 && events.length > 0 && !submitting

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ backgroundColor: 'rgba(0,0,0,0.45)' }}
      onClick={onClose}
    >
      <div
        className="relative bg-surface-primary rounded-2xl shadow-xl w-full max-w-md mx-4 flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-border-primary-light shrink-0">
          <div className="text-base font-semibold text-content-primary">Add endpoint</div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-md text-content-tertiary hover:bg-surface-secondary hover:text-content-primary transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X width={16} height={16} strokeWidth={1.5} />
          </button>
        </div>

        {/* Body */}
        <form id="add-endpoint-form" onSubmit={handleSubmit}>
          <div className="px-6 py-5 space-y-5">
            {/* URL */}
            <div>
              <label className="block text-sm font-medium text-content-primary mb-1.5">
                Endpoint URL
              </label>
              <TextInput
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://api.yourapp.com/webhooks"
                required
                autoFocus
                className="w-full"
              />
              <p className="mt-1.5 text-xs text-content-tertiary">
                Must be publicly accessible and respond with a 2xx status.
              </p>
            </div>

            {/* Events */}
            <div>
              <label className="block text-sm font-medium text-content-primary mb-1.5">
                Events to subscribe
              </label>
              <div className="flex flex-wrap gap-2">
                {ALL_EVENTS.map((event) => (
                  <button
                    key={event}
                    type="button"
                    onClick={() => toggleEvent(event)}
                    className={[
                      'px-3 py-1.5 rounded-full text-xs font-medium border transition-colors cursor-pointer',
                      events.includes(event)
                        ? 'bg-action-primary-main text-content-inverse border-action-primary-main'
                        : 'bg-surface-primary text-content-secondary border-border-primary-main hover:border-action-primary-main',
                    ].join(' ')}
                  >
                    {event}
                  </button>
                ))}
              </div>
              {events.length === 0 && (
                <p className="mt-1.5 text-xs text-content-tertiary">Select at least one event.</p>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 px-6 pb-5 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-sm font-medium text-content-secondary hover:text-content-primary hover:bg-surface-secondary transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!canSubmit}
              className="px-4 py-2 rounded-lg bg-action-primary-main text-action-primary-contrast-text text-sm font-medium hover:bg-action-primary-dark disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
            >
              {submitting ? 'Adding…' : 'Add endpoint'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
