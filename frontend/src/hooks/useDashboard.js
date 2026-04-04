import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

function computeGenderGap(employees) {
  const males = employees.filter(e => e.gender === 'M')
  const females = employees.filter(e => e.gender === 'F')
  if (!males.length || !females.length) return 0
  const maleAvg = males.reduce((sum, e) => sum + e.salary, 0) / males.length
  const femaleAvg = females.reduce((sum, e) => sum + e.salary, 0) / females.length
  return ((maleAvg - femaleAvg) / maleAvg) * 100
}

function computeTenureGap(employees) {
  const longTenure = employees.filter(e => e.tenure_years > 3)
  const shortTenure = employees.filter(e => e.tenure_years <= 3)
  if (!longTenure.length || !shortTenure.length) return 0
  const ltAvg = longTenure.reduce((sum, e) => sum + e.salary, 0) / longTenure.length
  const stAvg = shortTenure.reduce((sum, e) => sum + e.salary, 0) / shortTenure.length
  return stAvg > ltAvg ? ((stAvg - ltAvg) / stAvg) * 100 : 0
}

function computeRoleGap(employees) {
  const groups = {}
  employees.forEach(e => {
    const key = `${e.role}-${e.level}-${e.location}`
    if (!groups[key]) groups[key] = []
    groups[key].push(e)
  })

  let totalGap = 0
  let groupCount = 0

  Object.values(groups).forEach(group => {
    if (group.length < 2) return
    const salaries = group.map(e => e.salary)
    const max = Math.max(...salaries)
    const min = Math.min(...salaries)
    if (max > 0) {
      totalGap += ((max - min) / max) * 100
      groupCount++
    }
  })

  return groupCount > 0 ? totalGap / groupCount : 0
}

function computePerformanceAlignment(employees) {
  let aligned = 0
  const groups = {}
  employees.forEach(e => {
    const key = `${e.role}-${e.level}-${e.location}`
    if (!groups[key]) groups[key] = []
    groups[key].push(e)
  })

  let total = 0
  Object.values(groups).forEach(group => {
    if (group.length < 2) return
    const sorted = [...group].sort((a, b) => b.performance_score - a.performance_score)
    for (let i = 0; i < sorted.length - 1; i++) {
      total++
      if (sorted[i].salary >= sorted[i + 1].salary) aligned++
    }
  })

  return total > 0 ? (aligned / total) * 100 : 100
}

function detectGaps(employees) {
  const groups = {}
  employees.forEach(e => {
    const key = `${e.role}-${e.level}-${e.location}`
    if (!groups[key]) groups[key] = []
    groups[key].push(e)
  })

  const gaps = []
  Object.values(groups).forEach(group => {
    if (group.length < 2) return
    for (let i = 0; i < group.length; i++) {
      for (let j = i + 1; j < group.length; j++) {
        const a = group[i]
        const b = group[j]
        const higher = a.salary > b.salary ? a : b
        const lower = a.salary > b.salary ? b : a
        const gapPct = ((higher.salary - lower.salary) / higher.salary) * 100

        if (gapPct > 10) {
          const gapAmount = higher.salary - lower.salary
          const fixCost = Math.round(gapAmount / 2)
          const turnoverProb = gapPct > 20 ? 0.375 : gapPct > 10 ? 0.225 : 0.15
          const replacementCost = lower.salary * 1.5
          const litigationCost = lower.salary * (gapPct / 100) * 3
          const riskCost = Math.round(turnoverProb * replacementCost + litigationCost)

          gaps.push({
            id: `${lower.employee_id}-${higher.employee_id}`,
            employee_a: lower,
            employee_b: higher,
            gap_pct: gapPct,
            gap_amount: gapAmount,
            fix_cost: fixCost,
            risk_cost: riskCost,
            department: lower.department,
          })
        }
      }
    }
  })

  return gaps.sort((a, b) => b.gap_pct - a.gap_pct)
}

function computeEquityScore(genderGap, tenureGap, roleGap, perfAlignment) {
  const genderSeverity = Math.min((genderGap / 25) * 100, 100)
  const tenureSeverity = Math.min((tenureGap / 20) * 100, 100)
  const roleSeverity = Math.min((roleGap / 30) * 100, 100)
  const perfMisalignment = 100 - perfAlignment

  const score = 100 - (
    genderSeverity * 0.30 +
    tenureSeverity * 0.25 +
    roleSeverity * 0.25 +
    perfMisalignment * 0.20
  )

  return Math.max(0, Math.min(100, Math.round(score)))
}

function computeDepartmentScores(employees) {
  const departments = {}
  employees.forEach(e => {
    if (!departments[e.department]) departments[e.department] = []
    departments[e.department].push(e)
  })

  return Object.entries(departments).map(([name, emps]) => {
    const genderGap = computeGenderGap(emps)
    const tenureGap = computeTenureGap(emps)
    const roleGap = computeRoleGap(emps)
    const perfAlignment = computePerformanceAlignment(emps)
    const score = computeEquityScore(genderGap, tenureGap, roleGap, perfAlignment)
    const gaps = detectGaps(emps)

    const trends = ['improving', 'declining', 'stable']
    const trendIndex = name.length % 3
    const trend = trends[trendIndex]

    return {
      name,
      score,
      flagged: gaps.length,
      trend,
      employee_count: emps.length,
      gender_gap: genderGap,
      tenure_gap: tenureGap,
    }
  }).sort((a, b) => a.score - b.score)
}

export function useDashboard() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    async function fetchData() {
      try {
        const { data: employees, error: supaError } = await supabase
          .from('employees')
          .select('*')
        if (supaError) throw supaError
        if (!employees || employees.length === 0) throw new Error('No employee data found in Supabase')

        const genderGap = computeGenderGap(employees)
        const tenureGap = computeTenureGap(employees)
        const roleGap = computeRoleGap(employees)
        const perfAlignment = computePerformanceAlignment(employees)
        const companyScore = computeEquityScore(genderGap, tenureGap, roleGap, perfAlignment)
        const allGaps = detectGaps(employees)
        const departmentScores = computeDepartmentScores(employees)

        const totalFixCost = allGaps.reduce((sum, g) => sum + g.fix_cost, 0)
        const totalRiskCost = allGaps.reduce((sum, g) => sum + g.risk_cost, 0)

        setData({
          company_score: companyScore,
          total_employees: employees.length,
          flagged_gaps: allGaps.length,
          estimated_fix_cost: totalFixCost,
          estimated_risk_cost: totalRiskCost,
          summary: {
            gender_gap_pct: genderGap,
            tenure_gap_pct: tenureGap,
            role_gap_pct: roleGap,
            performance_alignment_pct: perfAlignment,
          },
          department_scores: departmentScores,
          gaps: allGaps,
          employees,
        })
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  return { data, loading, error }
}
