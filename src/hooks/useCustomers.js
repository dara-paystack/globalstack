import { useState, useEffect, useCallback } from 'react'
import { useMode } from '../context/ModeContext'
import { useAccount } from '../context/AccountContext'

export function useCustomers({ kycStatus = '' } = {}) {
  const { mode } = useMode()
  const { isReadOnly } = useAccount()
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchData = useCallback(async () => {
    // Pending accounts have no customers yet — short-circuit to empty.
    if (isReadOnly) {
      setData([])
      setError(null)
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams({ mode })
      if (kycStatus) params.set('kycStatus', kycStatus)
      const res = await fetch(`/api/customers?${params}`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const json = await res.json()
      setData(json.data)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [mode, kycStatus, isReadOnly])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  return { data, loading, error, refetch: fetchData }
}

export function useCustomer(id) {
  const { mode } = useMode()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchData = useCallback(async () => {
    if (!id) { setLoading(false); return }
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/customers/${id}?mode=${mode}`)
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
