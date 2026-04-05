import { useState, useEffect, useMemo, useRef } from 'react'
import { useDashboard } from '../hooks/useDashboard'

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8001'

const CATEGORY_META = {
  gender_gap:               { label: 'Gender',      color: '#ef4444', bg: '#fef2f2' },
  tenure_compression:       { label: 'Tenure',      color: '#f97316', bg: '#fff7ed' },
  role_gap:                 { label: 'Role',        color: '#eab308', bg: '#fefce8' },
  performance_misalignment: { label: 'Performance', color: '#3b82f6', bg: '#eff6ff' },
}

const fmtMoney = n => `$${Math.round(n || 0).toLocaleString()}`

function scoreColor(s) {
  if (s >= 70) return '#10b981'
  if (s >= 50) return '#eab308'
  return '#ef4444'
}

function Gauge({ score, label }) {
  const color = scoreColor(score)
  return (
    <div style={{ textAlign: 'center' }}>
      <p style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 600, margin: 0, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{label}</p>
      <div style={{ position: 'relative', width: '140px', height: '70px', margin: '12px auto 8px', overflow: 'hidden' }}>
        <div style={{
          width: '140px', height: '140px', borderRadius: '50%',
          background: `conic-gradient(${color} 0deg, ${color} ${score * 1.8}deg, #e2e8f0 ${score * 1.8}deg, #e2e8f0 180deg, transparent 180deg)`,
          position: 'absolute', top: 0,
          transition: 'background 300ms ease',
        }} />
        <div style={{ width: '104px', height: '104px', borderRadius: '50%', background: 'white', position: 'absolute', top: '18px', left: '18px' }} />
      </div>
      <div style={{ fontSize: '40px', fontWeight: 800, color: '#1e293b', lineHeight: 1 }}>
        {typeof score === 'number' ? score.toFixed(1) : score}
      </div>
    </div>
  )
}

export default function Simulator() {
  const { data: dash } = useDashboard()
  const [budget, setBudget] = useState(50000)
  const [dept, setDept] = useState('all')
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [expanded, setExpanded] = useState(false)
  const debounceRef = useRef(null)

  const departments = useMemo(
    () => (dash?.department_scores || []).map(d => d.name).sort(),
    [dash]
  )

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      setLoading(true)
      setError(null)
      fetch(`${API_BASE}/api/simulator`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ budget, department: dept }),
      })
        .then(r => { if (!r.ok) throw new Error(`/api/simulator ${r.status}`); return r.json() })
        .then(setResult)
        .catch(e => setError(e.message))
        .finally(() => setLoading(false))
    }, 300)
    return () => debounceRef.current && clearTimeout(debounceRef.current)
  }, [budget, dept])

  const before = result?.before_score_precise ?? result?.before_score ?? 0
  const after = result?.after_score_precise ?? result?.after_score ?? 0
  const delta = result?.score_delta_precise ?? result?.score_delta ?? 0
  const maxCatCost = useMemo(() => {
    if (!result) return 0
    return Math.max(1, ...Object.values(result.cost_by_category || {}))
  }, [result])

  const adjustments = result?.adjustments || []
  const preview = expanded ? adjustments : adjustments.slice(0, 10)

  return (
    <div style={{ padding: '32px', fontFamily: 'Inter, system-ui, sans-serif', overflowY: 'auto', flex: 1 }}>
      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '22px', fontWeight: 700, color: '#1e293b', margin: 0 }}>What-If Simulator</h1>
        <p style={{ fontSize: '13px', color: '#94a3b8', marginTop: '4px' }}>
          Model how a remediation budget would move the equity score.
        </p>
      </div>

      {/* Controls */}
      <div style={{ background: 'white', borderRadius: '16px', border: '1px solid #e2e8f0', padding: '24px', marginBottom: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <label style={{ fontSize: '12px', fontWeight: 600, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Remediation Budget
          </label>
          <span style={{ fontSize: '22px', fontWeight: 800, color: '#1e293b' }}>{fmtMoney(budget)}</span>
        </div>
        <input
          type="range"
          min={0}
          max={1000000}
          step={5000}
          value={budget}
          onChange={e => setBudget(Number(e.target.value))}
          style={{ width: '100%', accentColor: '#3b82f6' }}
        />
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>
          <span>$0</span><span>$500K</span><span>$1M</span>
        </div>

        <div style={{ display: 'flex', gap: '24px', alignItems: 'center', marginTop: '20px', flexWrap: 'wrap' }}>
          <div>
            <label style={{ fontSize: '11px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', marginRight: '8px' }}>
              Department
            </label>
            <select
              value={dept}
              onChange={e => setDept(e.target.value)}
              style={{ padding: '6px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', background: 'white' }}
            >
              <option value="all">All</option>
              {departments.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
          {loading && <span style={{ fontSize: '12px', color: '#94a3b8' }}>Simulating…</span>}
          {error && <span style={{ fontSize: '12px', color: '#ef4444' }}>{error}</span>}
        </div>
      </div>

      {/* Scores + stats */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
        <div style={{ background: 'white', borderRadius: '16px', border: '1px solid #e2e8f0', padding: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'center' }}>
            <Gauge score={before} label="Before" />
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '28px', color: '#94a3b8' }}>→</div>
              <div style={{
                fontSize: '18px', fontWeight: 700,
                color: delta > 0 ? '#10b981' : delta < 0 ? '#ef4444' : '#64748b',
                marginTop: '4px',
              }}>
                {delta > 0 ? '+' : ''}{Number(delta).toFixed(1)}
              </div>
            </div>
            <Gauge score={after} label="After" />
          </div>
        </div>

        <div style={{ background: 'white', borderRadius: '16px', border: '1px solid #e2e8f0', padding: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
            <Stat label="Employees Affected" value={result?.affected_count ?? 0} />
            <Stat label="Adjustments Made" value={result?.adjustment_count ?? 0} />
            <Stat label="Budget Used" value={fmtMoney(result?.budget_used)} />
            <Stat label="Budget Remaining" value={fmtMoney(result?.budget_remaining)} />
          </div>

          {/* Cost by category */}
          <div style={{ marginTop: '20px' }}>
            <p style={{ fontSize: '11px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '10px' }}>
              Spend by Category
            </p>
            {Object.keys(result?.cost_by_category || {}).length === 0 && (
              <p style={{ fontSize: '12px', color: '#94a3b8', fontStyle: 'italic' }}>No allocations yet.</p>
            )}
            {Object.entries(result?.cost_by_category || {}).map(([cat, cost]) => {
              const meta = CATEGORY_META[cat] || { label: cat, color: '#64748b', bg: '#f1f5f9' }
              const pct = (cost / maxCatCost) * 100
              return (
                <div key={cat} style={{ marginBottom: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '3px' }}>
                    <span style={{ color: '#475569', fontWeight: 500 }}>{meta.label}</span>
                    <span style={{ color: '#1e293b', fontWeight: 600 }}>{fmtMoney(cost)}</span>
                  </div>
                  <div style={{ height: '8px', background: '#f1f5f9', borderRadius: '4px', overflow: 'hidden' }}>
                    <div style={{ width: `${pct}%`, height: '100%', background: meta.color, transition: 'width 300ms ease' }} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Adjustments list */}
      <div style={{ background: 'white', borderRadius: '16px', border: '1px solid #e2e8f0', padding: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h2 style={{ fontSize: '15px', fontWeight: 700, color: '#1e293b', margin: 0 }}>
            Proposed Adjustments ({adjustments.length})
          </h2>
          {adjustments.length > 10 && (
            <button
              onClick={() => setExpanded(v => !v)}
              style={{ padding: '6px 12px', fontSize: '12px', fontWeight: 600, borderRadius: '8px', border: '1px solid #cbd5e1', background: 'white', color: '#475569', cursor: 'pointer' }}
            >
              {expanded ? 'Show top 10' : `Show all ${adjustments.length}`}
            </button>
          )}
        </div>

        {adjustments.length === 0 ? (
          <p style={{ fontSize: '13px', color: '#94a3b8', fontStyle: 'italic' }}>
            No adjustments fit within the current budget and filters.
          </p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                  <Th>Employee</Th>
                  <Th>Dept · Role</Th>
                  <Th>Category</Th>
                  <Th align="right">Current</Th>
                  <Th align="right">Proposed</Th>
                  <Th align="right">Increase</Th>
                </tr>
              </thead>
              <tbody>
                {preview.map((a, i) => {
                  const meta = CATEGORY_META[a.category] || { label: a.category, color: '#64748b', bg: '#f1f5f9' }
                  return (
                    <tr key={`${a.employee_id}-${a.category}-${i}`} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '10px 8px', color: '#1e293b', fontWeight: 500 }}>{a.name}</td>
                      <td style={{ padding: '10px 8px', color: '#64748b' }}>{a.department} · {a.role} · {a.level}</td>
                      <td style={{ padding: '10px 8px' }}>
                        <span style={{
                          padding: '2px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: 600,
                          background: meta.bg, color: meta.color,
                        }}>{meta.label}</span>
                      </td>
                      <td style={{ padding: '10px 8px', textAlign: 'right', color: '#64748b' }}>{fmtMoney(a.current_salary)}</td>
                      <td style={{ padding: '10px 8px', textAlign: 'right', color: '#1e293b', fontWeight: 600 }}>{fmtMoney(a.proposed_salary)}</td>
                      <td style={{ padding: '10px 8px', textAlign: 'right', color: '#10b981', fontWeight: 700 }}>+{fmtMoney(a.increase)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

function Stat({ label, value }) {
  return (
    <div>
      <p style={{ fontSize: '11px', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px', margin: 0 }}>{label}</p>
      <p style={{ fontSize: '22px', fontWeight: 800, color: '#1e293b', margin: '4px 0 0' }}>{value}</p>
    </div>
  )
}

function Th({ children, align = 'left' }) {
  return (
    <th style={{
      padding: '10px 8px', textAlign: align,
      fontSize: '11px', fontWeight: 600, color: '#64748b',
      textTransform: 'uppercase', letterSpacing: '0.5px',
    }}>{children}</th>
  )
}
