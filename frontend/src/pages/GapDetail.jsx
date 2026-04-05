import { useState, useMemo, useRef, useEffect } from 'react'
import { useGaps } from '../hooks/useGaps'
import { useGapDetail } from '../hooks/useGapDetail'

const FLAG_META = {
  gender_gap:               { label: 'Gender',      bg: '#fef2f2', color: '#991b1b', border: '#fecaca' },
  tenure_compression:       { label: 'Tenure',      bg: '#fff7ed', color: '#9a3412', border: '#fed7aa' },
  role_gap:                 { label: 'Role',        bg: '#fefce8', color: '#854d0e', border: '#fde68a' },
  performance_misalignment: { label: 'Performance', bg: '#eff6ff', color: '#1e40af', border: '#bfdbfe' },
}

const GAP_TYPES = [
  { key: 'all',         label: 'All' },
  { key: 'gender',      label: 'Gender',      flag: 'gender_gap' },
  { key: 'tenure',      label: 'Tenure',      flag: 'tenure_compression' },
  { key: 'role',        label: 'Role',        flag: 'role_gap' },
  { key: 'performance', label: 'Performance', flag: 'performance_misalignment' },
]

export default function GapDetail() {
  const { data, loading, error } = useGaps()
  const [dept, setDept] = useState('all')
  const [gapType, setGapType] = useState('all')
  const [sortKey, setSortKey] = useState('priority_score')
  const [sortDir, setSortDir] = useState('desc')
  const [selectedId, setSelectedId] = useState(null)
  const [hoverId, setHoverId] = useState(null)
  const expandRef = useRef(null)

  useEffect(() => {
    if (selectedId && expandRef.current) {
      expandRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    }
  }, [selectedId])

  function toggleSort(key) {
    if (sortKey === key) {
      setSortDir(d => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortDir('desc')
    }
  }

  const results = data?.results || []

  const departments = useMemo(
    () => [...new Set(results.map(r => r.department).filter(Boolean))].sort(),
    [results]
  )

  const flagCounts = useMemo(() => {
    const c = { gender_gap: 0, tenure_compression: 0, role_gap: 0, performance_misalignment: 0 }
    results.forEach(r => Object.keys(c).forEach(k => { if (r[k]) c[k] += 1 }))
    return c
  }, [results])

  const filtered = useMemo(() => {
    const list = results.filter(r => {
      if (dept !== 'all' && r.department !== dept) return false
      if (gapType !== 'all') {
        const meta = GAP_TYPES.find(g => g.key === gapType)
        if (meta && !r[meta.flag]) return false
      }
      return true
    })
    const sorted = [...list].sort((a, b) => {
      const av = a[sortKey]
      const bv = b[sortKey]
      if (av == null && bv == null) return 0
      if (av == null) return 1
      if (bv == null) return -1
      if (typeof av === 'number' && typeof bv === 'number') return av - bv
      return String(av).localeCompare(String(bv))
    })
    if (sortDir === 'desc') sorted.reverse()
    return sorted
  }, [results, dept, gapType, sortKey, sortDir])

  if (loading) return <div style={{ padding: '40px', color: '#64748b' }}>Loading gaps...</div>
  if (error)   return <div style={{ padding: '40px', color: '#ef4444' }}>Error: {error}</div>

  return (
    <div style={{ padding: '32px', fontFamily: 'Inter, system-ui, sans-serif', overflowY: 'auto', flex: 1 }}>
      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '22px', fontWeight: '700', color: '#1e293b', margin: 0 }}>Gap Analysis</h1>
        <p style={{ fontSize: '13px', color: '#94a3b8', marginTop: '4px' }}>
          Employees flagged for pay equity review
        </p>
      </div>

      {/* Summary strip */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '14px', marginBottom: '20px' }}>
        <SummaryCard label="Total Flagged" value={data?.count ?? 0} color="#ef4444" />
        <SummaryCard label="Gender"        value={flagCounts.gender_gap}               color="#991b1b" />
        <SummaryCard label="Tenure"        value={flagCounts.tenure_compression}       color="#9a3412" />
        <SummaryCard label="Role"          value={flagCounts.role_gap}                 color="#854d0e" />
        <SummaryCard label="Performance"   value={flagCounts.performance_misalignment} color="#1e40af" />
      </div>

      {/* Filter bar */}
      <div style={{
        background: 'white', borderRadius: '12px', border: '1px solid #e2e8f0',
        padding: '14px 18px', marginBottom: '16px', display: 'flex', alignItems: 'center',
        gap: '16px', flexWrap: 'wrap', boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '12px', fontWeight: '600', color: '#64748b' }}>Department</span>
          <select
            value={dept}
            onChange={e => setDept(e.target.value)}
            style={{
              fontSize: '13px', padding: '6px 10px', borderRadius: '8px',
              border: '1px solid #e2e8f0', background: 'white', color: '#1e293b', outline: 'none'
            }}
          >
            <option value="all">All</option>
            {departments.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
          {GAP_TYPES.map(g => {
            const active = gapType === g.key
            return (
              <button
                key={g.key}
                onClick={() => setGapType(g.key)}
                style={{
                  fontSize: '12px', fontWeight: '600', padding: '6px 12px', borderRadius: '20px',
                  border: `1px solid ${active ? '#1e293b' : '#e2e8f0'}`,
                  background: active ? '#1e293b' : 'white',
                  color: active ? 'white' : '#64748b', cursor: 'pointer'
                }}
              >
                {g.label}
              </button>
            )
          })}
        </div>

        <div style={{ marginLeft: 'auto', fontSize: '12px', color: '#94a3b8' }}>
          Showing <strong style={{ color: '#1e293b' }}>{filtered.length}</strong> of {data?.count ?? 0}
        </div>
      </div>

      {/* Table */}
      <div style={{ background: 'white', borderRadius: '14px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.04)', overflow: 'hidden' }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(6, 1fr)', columnGap: '32px',
          padding: '12px 22px', borderBottom: '1px solid #f1f5f9',
          fontSize: '11px', fontWeight: '600', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px'
        }}>
          <SortHeader label="Employee"            colKey="name"           sortKey={sortKey} sortDir={sortDir} onClick={toggleSort} />
          <SortHeader label="Dept · Role · Level" colKey="department"     sortKey={sortKey} sortDir={sortDir} onClick={toggleSort} />
          <SortHeader label="Salary"              colKey="salary"         sortKey={sortKey} sortDir={sortDir} onClick={toggleSort} />
          <SortHeader label="Flags"               colKey="flag_count"     sortKey={sortKey} sortDir={sortDir} onClick={toggleSort} />
          <SortHeader label="Priority"            colKey="priority_score" sortKey={sortKey} sortDir={sortDir} onClick={toggleSort} />
          <SortHeader label="Fix / Risk"          colKey="fix_cost"       sortKey={sortKey} sortDir={sortDir} onClick={toggleSort} />
        </div>

        {filtered.length === 0 && (
          <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8', fontSize: '13px' }}>
            No flagged employees match these filters.
          </div>
        )}

        {filtered.map(r => {
          const isSelected = selectedId === r.employee_id
          return (
            <div key={r.employee_id}>
              {/* Row */}
              <div
                onClick={() => setSelectedId(isSelected ? null : r.employee_id)}
                onMouseEnter={() => setHoverId(r.employee_id)}
                onMouseLeave={() => setHoverId(null)}
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(6, 1fr)', columnGap: '32px',
                  alignItems: 'center', padding: '14px 22px',
                  borderBottom: isSelected ? 'none' : '1px solid #f8fafc',
                  cursor: 'pointer',
                  background: isSelected ? 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)' : hoverId === r.employee_id ? '#f8fafc' : 'white',
                  transition: 'all 250ms ease',
                  borderLeft: isSelected ? '4px solid #3b82f6' : '4px solid transparent',
                }}
              >
                <div>
                  <p style={{ fontSize: '13px', fontWeight: '600', color: isSelected ? '#f1f5f9' : '#1e293b', margin: 0 }}>{r.name}</p>
                  <p style={{ fontSize: '11px', color: isSelected ? '#64748b' : '#94a3b8', margin: 0 }}>{r.employee_id}</p>
                </div>
                <div>
                  <p style={{ fontSize: '13px', color: isSelected ? '#cbd5e1' : '#475569', margin: 0 }}>{r.department}</p>
                  <p style={{ fontSize: '11px', color: isSelected ? '#64748b' : '#94a3b8', margin: 0 }}>{r.role} · L{r.level}</p>
                  {r.location && (
                    <p style={{ fontSize: '10px', color: isSelected ? '#94a3b8' : '#64748b', margin: '2px 0 0', display: 'flex', alignItems: 'center', gap: '3px' }}>
                      <span>📍</span>{r.location}
                    </p>
                  )}
                </div>
                <div style={{ fontSize: '13px', fontWeight: '600', color: isSelected ? '#f1f5f9' : '#1e293b' }}>
                  ${r.salary?.toLocaleString()}
                </div>
                <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                  {Object.keys(FLAG_META).map(k => r[k] && (
                    <span key={k} style={{
                      fontSize: '10px', fontWeight: '600', padding: '3px 8px', borderRadius: '12px',
                      background: isSelected ? FLAG_META[k].color : FLAG_META[k].bg,
                      color: isSelected ? '#fff' : FLAG_META[k].color,
                      border: `1px solid ${isSelected ? 'transparent' : FLAG_META[k].border}`
                    }}>
                      {FLAG_META[k].label}
                    </span>
                  ))}
                </div>
                <div style={{ fontSize: '13px', fontWeight: '700', color: isSelected ? '#f87171' : '#ef4444' }}>
                  {r.priority_score}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <p style={{ fontSize: '12px', fontWeight: '600', color: isSelected ? '#34d399' : '#065f46', margin: 0 }}>
                      ${r.fix_cost?.toLocaleString()}
                    </p>
                    <p style={{ fontSize: '11px', color: isSelected ? '#fca5a5' : '#991b1b', margin: 0 }}>
                      ${r.risk_cost?.toLocaleString()}
                    </p>
                  </div>
                  <span style={{
                    fontSize: '16px', color: isSelected ? '#94a3b8' : '#cbd5e1',
                    transform: isSelected ? 'rotate(180deg)' : 'rotate(0)',
                    transition: 'transform 250ms ease', display: 'inline-block',
                  }}>▾</span>
                </div>
              </div>

              {/* Expand-below panel */}
              {isSelected && (
                <div ref={expandRef} style={{
                  background: 'linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%)',
                  borderBottom: '2px solid #3b82f6',
                  padding: '0',
                  overflow: 'hidden',
                  animation: 'slideDown 300ms ease forwards',
                }}>
                  <style>{`
                    @keyframes slideDown {
                      from { max-height: 0; opacity: 0; padding: 0 24px; }
                      to   { max-height: 2000px; opacity: 1; padding: 24px 24px; }
                    }
                  `}</style>
                  <ExpandedAnalysis employeeId={r.employee_id} row={r} onClose={() => setSelectedId(null)} />
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function SortHeader({ label, colKey, sortKey, sortDir, onClick, align = 'left' }) {
  const active = sortKey === colKey
  const arrow = active ? (sortDir === 'asc' ? ' ▲' : ' ▼') : ''
  return (
    <div
      onClick={() => onClick(colKey)}
      style={{
        textAlign: align, cursor: 'pointer', userSelect: 'none',
        color: active ? '#1e293b' : '#94a3b8'
      }}
    >
      {label}{arrow}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Expanded Analysis Panel (renders below the clicked row)            */
/* ------------------------------------------------------------------ */

const CATEGORY_COLORS = {
  gender_gap:               { bg: '#fef2f2', accent: '#ef4444', text: '#991b1b', bar: '#f87171' },
  tenure_compression:       { bg: '#fff7ed', accent: '#f97316', text: '#9a3412', bar: '#fb923c' },
  role_gap:                 { bg: '#fefce8', accent: '#eab308', text: '#854d0e', bar: '#facc15' },
  performance_misalignment: { bg: '#eff6ff', accent: '#3b82f6', text: '#1e40af', bar: '#60a5fa' },
}

function ExpandedAnalysis({ employeeId, row, onClose }) {
  const { data, loading, error } = useGapDetail(employeeId)

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '20px 0' }}>
      <div style={{
        width: '20px', height: '20px', border: '3px solid #e2e8f0', borderTopColor: '#3b82f6',
        borderRadius: '50%', animation: 'spin 600ms linear infinite',
      }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      <span style={{ fontSize: '13px', color: '#64748b' }}>Analyzing {row.name}...</span>
    </div>
  )

  if (error) return (
    <div style={{ padding: '16px 0', color: '#ef4444', fontSize: '13px' }}>Failed to load analysis: {error}</div>
  )

  if (!data || !data.categories?.length) return (
    <div style={{ padding: '16px 0', color: '#94a3b8', fontSize: '13px' }}>No comparison data available.</div>
  )

  return (
    <div>
      {/* Panel header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
        <div>
          <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#0f172a', margin: 0 }}>
            Deep Dive — {data.name}
          </h3>
          <p style={{ fontSize: '12px', color: '#64748b', margin: '4px 0 0' }}>
            Flagged in <strong style={{ color: '#ef4444' }}>{data.categories.length}</strong> categor{data.categories.length === 1 ? 'y' : 'ies'}
            {' · '}{data.department} · {data.role} · L{data.level}
            {data.location && ` · 📍 ${data.location}`}
            {' · '}{data.tenure_years}yr tenure · perf {data.performance_score}
          </p>
        </div>
        <button onClick={onClose} style={{
          border: 'none', background: '#1e293b', color: '#fff', fontSize: '11px', fontWeight: 600,
          padding: '6px 14px', borderRadius: '8px', cursor: 'pointer',
        }}>Collapse ✕</button>
      </div>

      {/* Quick stats ribbon */}
      <div style={{
        display: 'flex', gap: '12px', marginBottom: '18px', flexWrap: 'wrap',
      }}>
        <QuickStat label="Salary" value={`$${data.salary?.toLocaleString()}`} icon="💰" />
        <QuickStat label="Avg Gap" value={`${(data.categories.reduce((s, c) => s + c.gap_percent, 0) / data.categories.length).toFixed(1)}%`} icon="📉" />
        <QuickStat label="Max Gap" value={`${Math.max(...data.categories.map(c => c.gap_percent)).toFixed(1)}%`} icon="🔺" />
        <QuickStat label="Peers Compared" value={data.categories.reduce((s, c) => s + (c.comparison_individuals?.length || 0), 0)} icon="👥" />
      </div>

      {/* Category cards */}
      <div style={{ display: 'grid', gridTemplateColumns: data.categories.length === 1 ? '1fr' : 'repeat(2, 1fr)', gap: '14px' }}>
        {data.categories.map(cat => (
          <InlineCategoryCard key={cat.category} cat={cat} />
        ))}
      </div>
    </div>
  )
}

function QuickStat({ label, value, icon }) {
  return (
    <div style={{
      background: 'white', borderRadius: '10px', padding: '10px 16px', flex: '1 1 120px',
      border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '10px',
      boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
    }}>
      <span style={{ fontSize: '18px' }}>{icon}</span>
      <div>
        <p style={{ fontSize: '10px', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.4px', margin: 0 }}>{label}</p>
        <p style={{ fontSize: '16px', fontWeight: 700, color: '#0f172a', margin: '1px 0 0' }}>{value}</p>
      </div>
    </div>
  )
}

function InlineCategoryCard({ cat }) {
  const c = CATEGORY_COLORS[cat.category] || { bg: '#f8fafc', accent: '#94a3b8', text: '#334155', bar: '#94a3b8' }
  const peers = cat.comparison_individuals || []

  return (
    <div style={{
      background: 'white', borderRadius: '12px', border: `1px solid ${c.accent}33`,
      overflow: 'hidden', boxShadow: '0 2px 6px rgba(0,0,0,0.04)',
    }}>
      {/* Card header stripe */}
      <div style={{
        background: `linear-gradient(135deg, ${c.accent} 0%, ${c.bar} 100%)`,
        padding: '10px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      }}>
        <span style={{ fontSize: '13px', fontWeight: 700, color: 'white' }}>{cat.label}</span>
        <span style={{
          background: 'rgba(255,255,255,0.2)', backdropFilter: 'blur(4px)',
          padding: '3px 10px', borderRadius: '999px', fontSize: '12px', fontWeight: 700, color: 'white',
        }}>
          -{cat.gap_percent}%
        </span>
      </div>

      <div style={{ padding: '14px 16px' }}>
        {/* Salary comparison */}
        <div style={{ display: 'flex', gap: '12px', marginBottom: '12px' }}>
          <div style={{ flex: 1, background: c.bg, borderRadius: '8px', padding: '10px 12px' }}>
            <p style={{ fontSize: '10px', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.4px', margin: 0 }}>This employee</p>
            <p style={{ fontSize: '18px', fontWeight: 700, color: '#0f172a', margin: '2px 0 0' }}>${cat.employee_salary?.toLocaleString()}</p>
          </div>
          <div style={{ flex: 1, background: '#f1f5f9', borderRadius: '8px', padding: '10px 12px' }}>
            <p style={{ fontSize: '10px', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.4px', margin: 0 }}>{cat.comparison_entity}</p>
            <p style={{ fontSize: '18px', fontWeight: 700, color: '#0f172a', margin: '2px 0 0' }}>${cat.comparison_salary?.toLocaleString()}</p>
          </div>
        </div>

        {/* Reason */}
        <p style={{
          fontSize: '12px', fontStyle: 'italic', color: '#475569', margin: '0 0 10px',
          padding: '8px 12px', background: c.bg, borderRadius: '8px', lineHeight: 1.5,
        }}>
          {cat.reason}
        </p>

        {/* Comparison peers */}
        {peers.length > 0 && (
          <div>
            <div style={{
              display: 'grid', gridTemplateColumns: '2fr 1.2fr 1fr 1fr 0.8fr', gap: '4px',
              fontSize: '10px', fontWeight: 600, color: '#94a3b8',
              textTransform: 'uppercase', letterSpacing: '0.4px',
              padding: '6px 8px', borderBottom: `1px solid ${c.accent}33`,
            }}>
              <div>Peer</div><div>Location</div><div>Salary</div><div>Tenure</div><div>Perf</div>
            </div>
            {peers.map(p => (
              <div key={p.employee_id} style={{
                display: 'grid', gridTemplateColumns: '2fr 1.2fr 1fr 1fr 0.8fr', gap: '4px',
                fontSize: '11px', color: '#334155', padding: '5px 8px',
                borderBottom: '1px solid #f1f5f9',
              }}>
                <div style={{ fontWeight: 600 }}>{p.name}</div>
                <div style={{ color: '#64748b' }}>📍 {p.location || '—'}</div>
                <div>${p.salary?.toLocaleString()}</div>
                <div>{p.tenure_years}yr</div>
                <div>⭐ {p.performance_score}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function SummaryCard({ label, value, color }) {
  return (
    <div style={{
      background: 'white', borderRadius: '12px', border: '1px solid #e2e8f0',
      padding: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
    }}>
      <p style={{ fontSize: '11px', fontWeight: '600', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px', margin: 0 }}>
        {label}
      </p>
      <p style={{ fontSize: '26px', fontWeight: '800', color, margin: '6px 0 0' }}>{value}</p>
    </div>
  )
}
