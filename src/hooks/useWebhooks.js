// Webhook-specific hooks — used by the GlobalPanel's WebhookPanel.
//
// Why no mode param here?
// Webhooks and their delivery history are not test/live-mode-separated
// in this prototype — the same endpoints exist in both modes (documented
// in CLAUDE.md as a known limitation). If we added test mode separation
// later, we'd add a `mode` param and forward it as ?mode=test just like
// useTransactions does.

import { useState, useEffect } from 'react'

// Fetch a single webhook endpoint by ID.
// Used by the panel header / summary section.
export function useWebhook(id) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!id) { setLoading(false); return }
    setLoading(true)
    setError(null)
    fetch(`/api/webhooks/${id}`)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        return r.json()
      })
      .then((json) => setData(json))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [id])

  return { data, loading, error }
}

// Fetch paginated deliveries for a single endpoint.
// page is a dependency — the hook re-fetches automatically when it changes.
// This is the right pattern for pagination: keep page in state at the
// call site, pass it as a param, and let useEffect handle the re-fetch.
export function useWebhookDeliveries(id, page = 1) {
  const [data, setData] = useState([])
  const [meta, setMeta] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!id) { setLoading(false); return }
    setLoading(true)
    setError(null)
    fetch(`/api/webhooks/${id}/deliveries?page=${page}&limit=15`)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        return r.json()
      })
      .then((json) => {
        setData(json.data)
        setMeta(json.meta)
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [id, page])

  return { data, meta, loading, error }
}
