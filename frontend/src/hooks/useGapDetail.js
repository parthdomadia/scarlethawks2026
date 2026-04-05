import { useState, useEffect } from 'react'

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8001'

export function useGapDetail(employeeId) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!employeeId) {
      setData(null)
      setError(null)
      setLoading(false)
      return
    }
    let cancelled = false
    async function fetchData() {
      setLoading(true)
      setError(null)
      setData(null)
      try {
        const url = `${API_BASE}/api/gaps/${employeeId}`
        const res = await fetch(url)
        if (!res.ok) throw new Error(`/api/gaps/${employeeId} ${res.status}`)
        const payload = await res.json()
        if (!cancelled) setData(payload)
      } catch (err) {
        if (!cancelled) setError(err.message)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    fetchData()
    return () => { cancelled = true }
  }, [employeeId])

  return { data, loading, error }
}
