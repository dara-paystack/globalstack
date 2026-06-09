// useRecipients — fetches the paginated recipients list.
//
// Recipients are not mode-separated (test/live) — they exist independently.
// This matches audit logs and webhooks: operational data doesn't flip with mode.
//
// useRecipients({ customerId, type, status, page, limit })
//   → { data, meta, loading, error, refetch }
//
// useRecipient(id)
//   → { data, loading, error }

import { useState, useEffect, useCallback } from 'react'
import { useAccount } from '../context/AccountContext'

export function useRecipients({ customerId = '', type = '', status = '', page = 1, limit = 15 } = {}) {
  const { isReadOnly } = useAccount()
  const [data, setData] = useState([])
  const [meta, setMeta] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchData = useCallback(async () => {
    // Pending accounts have no recipients yet — short-circuit to empty.
    if (isReadOnly) {
      setData([])
      setMeta({ total: 0, page: 1, limit, totalPages: 1 })
      setError(null)
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams()
      if (customerId) params.set('customerId', customerId)
      if (type) params.set('type', type)
      if (status) params.set('status', status)
      params.set('page', String(page))
      params.set('limit', String(limit))

      const res = await fetch(`/api/recipients?${params}`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const json = await res.json()
      setData(json.data)
      setMeta(json.meta)
    } catch (err) {
      setError(err)
    } finally {
      setLoading(false)
    }
  }, [customerId, type, status, page, limit, isReadOnly])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  return { data, meta, loading, error, refetch: fetchData }
}

export function useRecipient(id) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!id) { setLoading(false); return }
    setLoading(true)
    setError(null)
    fetch(`/api/recipients/${id}`)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        return res.json()
      })
      .then(setData)
      .catch(setError)
      .finally(() => setLoading(false))
  }, [id])

  return { data, loading, error }
}
