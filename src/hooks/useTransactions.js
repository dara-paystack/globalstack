import { useState, useEffect, useCallback } from 'react'
import { useMode } from '../context/ModeContext'
import { useAccount } from '../context/AccountContext'

// Fetches /api/transactions with optional filters and cursor-based pagination.
//
// Cursor pagination: instead of page numbers, we pass the ID of the last seen
// item as `cursor`. The server finds that item and returns the next `limit`
// records after it. This avoids the "page drift" problem where inserting a
// record shifts all subsequent pages.
//
// Returns { data, meta, loading, error, refetch } where meta contains:
//   { total, nextCursor, hasNext, hasPrev, limit }
export function useTransactions({ cursor = '', limit = 10, status = '', type = '', accountId = '', recipientId = '' } = {}) {
  const { mode } = useMode()
  const { isReadOnly } = useAccount()
  const [data, setData] = useState([])
  const [meta, setMeta] = useState({ total: 0, nextCursor: null, hasNext: false, hasPrev: false, limit: 10 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchData = useCallback(async () => {
    // Pending (in-review) accounts have no data yet — short-circuit to an empty
    // result so the page renders its existing empty state without an API round-trip.
    if (isReadOnly) {
      setData([])
      setMeta({ total: 0, nextCursor: null, hasNext: false, hasPrev: false, limit })
      setError(null)
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams({
        limit,
        mode,
        ...(cursor && { cursor }),
        ...(status && { status }),
        ...(type && { type }),
        ...(accountId && { accountId }),
        ...(recipientId && { recipientId }),
      })
      const res = await fetch(`/api/transactions?${params}`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const json = await res.json()
      setData(json.data)
      setMeta(json.meta)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [cursor, limit, status, type, accountId, recipientId, mode, isReadOnly])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  return { data, meta, loading, error, refetch: fetchData }
}

// Fetches a single transaction by ID
export function useTransaction(id) {
  const { mode } = useMode()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchData = useCallback(async () => {
    if (!id) { setLoading(false); return }
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/transactions/${id}?mode=${mode}`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      setData(await res.json())
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [id, mode])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  return { data, loading, error, refetch: fetchData }
}
