import { useState, useEffect } from 'react'

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8001'

export function useGaps() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    async function fetchData() {
      try {
        const url = `${API_BASE}/api/gaps`
        console.log('[useGaps] fetching', url)
        const res = await fetch(url)
        console.log('[useGaps] response status', res.status)
        if (!res.ok) throw new Error(`/api/gaps ${res.status}`)
        const payload = await res.json()
        console.log('[useGaps] payload', { count: payload.count, results: (payload.results || []).length })
        setData(payload)
      } catch (err) {
        console.error('[useGaps] error', err)
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  return { data, loading, error }
}
