import { useState, useEffect, useCallback } from 'react'

// useRequestLog — fetches the request log list with optional filters + offset pagination.
//
// Not mode-separated: API request logs are always real. The same integration
// key makes requests in both test and live contexts, but the log itself
// records the actual HTTP calls regardless. No ?mode= param needed.
//
// Pagination: offset-based (page numbers) rather than cursor-based.
// Developers read logs page-by-page; they know "page 3 of 8" and can jump.
// Cursor pagination is better for feeds where the dataset constantly changes;
// a request log is stable enough that page numbers are more usable.
//
// Returns { data, meta, loading, error, refetch } where meta is:
//   { total, page, limit, totalPages }
export function useRequestLog({
  page = 1,
  limit = 20,
  method = '',
  statusGroup = '',
  endpoint = '',
  dateRange = 'last_7',
} = {}) {
  const [data, setData] = useState([])
  const [meta, setMeta] = useState({ total: 0, page: 1, limit: 20, totalPages: 0 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(limit),
        ...(method && { method }),
        ...(statusGroup && { statusGroup }),
        ...(endpoint && { endpoint }),
        dateRange,
      })
      const res = await fetch(`/api/request-log?${params}`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const json = await res.json()
      setData(json.data)
      setMeta(json.meta)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [page, limit, method, statusGroup, endpoint, dateRange])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  return { data, meta, loading, error, refetch: fetchData }
}

// useRequestLogEntry — fetches a single request log entry by ID.
// Used by the detail panel.
export function useRequestLogEntry(id) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchData = useCallback(async () => {
    if (!id) { setLoading(false); return }
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/request-log/${id}`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      setData(await res.json())
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  return { data, loading, error, refetch: fetchData }
}
