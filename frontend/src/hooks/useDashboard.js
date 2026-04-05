import { useState, useEffect } from 'react'

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8001'

function computeGenderGap(employees) {
  const males = employees.filter(e => e.gender === 'M')
  const females = employees.filter(e => e.gender === 'F')
  if (!males.length || !females.length) return 0
  const maleAvg = males.reduce((s, e) => s + e.salary, 0) / males.length
  const femaleAvg = females.reduce((s, e) => s + e.salary, 0) / females.length
  return ((maleAvg - femaleAvg) / maleAvg) * 100
}

function computeTenureGap(employees) {
  const longT = employees.filter(e => e.tenure_years > 3)
  const shortT = employees.filter(e => e.tenure_years <= 3)
  if (!longT.length || !shortT.length) return 0
  const ltAvg = longT.reduce((s, e) => s + e.salary, 0) / longT.length
  const stAvg = shortT.reduce((s, e) => s + e.salary, 0) / shortT.length
  return stAvg > ltAvg ? ((stAvg - ltAvg) / stAvg) * 100 : 0
}

export function useDashboard() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    async function fetchData() {
      try {
        console.log('[useDashboard] fetching', `${API_BASE}/api/dashboard`, 'and', `${API_BASE}/api/employees?limit=1000`)
        const [dashRes, empRes] = await Promise.all([
          fetch(`${API_BASE}/api/dashboard`),
          fetch(`${API_BASE}/api/employees?limit=1000`),
        ])
        console.log('[useDashboard] responses', { dashboard: dashRes.status, employees: empRes.status })
        if (!dashRes.ok) throw new Error(`/api/dashboard ${dashRes.status}`)
        if (!empRes.ok) throw new Error(`/api/employees ${empRes.status}`)

        const dashboard = await dashRes.json()
        const empPayload = await empRes.json()
        console.log('[useDashboard] payload', { dashboard, employeeCount: (empPayload.results || []).length })
        const employees = empPayload.results || []

        // Enrich department_scores with fields Dashboard.jsx expects
        // (gender_gap, tenure_gap) — computed client-side until backend exposes them.
        const byDept = {}
        employees.forEach(e => {
          if (!byDept[e.department]) byDept[e.department] = []
          byDept[e.department].push(e)
        })
        const enrichedDepts = dashboard.department_scores.map(d => ({
          ...d,
          gender_gap: computeGenderGap(byDept[d.name] || []),
          tenure_gap: computeTenureGap(byDept[d.name] || []),
        }))

        setData({
          ...dashboard,
          department_scores: enrichedDepts,
          employees,
        })
      } catch (err) {
        console.error('[useDashboard] error', err)
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  return { data, loading, error }
}
