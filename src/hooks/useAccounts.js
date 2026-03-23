import { useState, useEffect, useCallback } from 'react'
import { useMode } from '../context/ModeContext'

// Fetches all accounts (or filtered by owner) without pagination.
// Used by the Accounts page banner (aggregate stats) and the Overview page.
// Old callers: useAccounts() — returns all accounts, filter client-side.
// New callers: useAccounts({ owner: 'merchant' }) — returns merchant accounts only.
export function useAccounts({ owner = '' } = {}) {
  const { mode } = useMode()
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams({ mode })
      if (owner) params.set('owner', owner)
      const res = await fetch(`/api/accounts?${params}`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const json = await res.json()
      setData(json.data)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [mode, owner])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  return { data, loading, error, refetch: fetchData }
}

// Fetches customer accounts with server-side search, filter, sort, and pagination.
// Used by the customer accounts flat table in Accounts.jsx.
//
// Why server-side sort + paginate instead of client-side?
// Sort must operate on the full filtered dataset before slicing pages.
// Client-side sort would only sort the current page — each page would be sorted
// independently, making the balance column meaningless for comparing accounts
// across pages.
export function useCustomerAccounts({
  page = 1,
  limit = 15,
  search = '',
  type = '',
  sort = 'balance_desc',
} = {}) {
  const { mode } = useMode()
  const [data, setData] = useState([])
  const [meta, setMeta] = useState({ total: 0, page: 1, limit: 15, totalPages: 1 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams({
        mode,
        owner: 'customer',
        page: String(page),
        limit: String(limit),
        sort,
      })
      if (search) params.set('search', search)
      if (type) params.set('type', type)
      const res = await fetch(`/api/accounts?${params}`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const json = await res.json()
      setData(json.data)
      setMeta(json.meta)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [mode, page, limit, search, type, sort])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  return { data, meta, loading, error, refetch: fetchData }
}

export function useAccount(id) {
  const { mode } = useMode()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchData = useCallback(async () => {
    if (!id) { setLoading(false); return }
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/accounts/${id}?mode=${mode}`)
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
