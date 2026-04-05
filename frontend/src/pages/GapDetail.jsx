import { useState, useMemo } from 'react'
import { useGaps } from '../hooks/useGaps'
import EmployeeDetailDrawer from '../components/EmployeeDetailDrawer'

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

        {filtered.map(r => (
          <div
            key={r.employee_id}
            onClick={() => setSelectedId(r.employee_id)}
            onMouseEnter={() => setHoverId(r.employee_id)}
            onMouseLeave={() => setHoverId(null)}
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(6, 1fr)', columnGap: '32px',
              alignItems: 'center', padding: '14px 22px', borderBottom: '1px solid #f8fafc',
              cursor: 'pointer',
              background: hoverId === r.employee_id ? '#f8fafc' : 'white',
            }}
          >
            <div>
              <p style={{ fontSize: '13px', fontWeight: '600', color: '#1e293b', margin: 0 }}>{r.name}</p>
              <p style={{ fontSize: '11px', color: '#94a3b8', margin: 0 }}>{r.employee_id}</p>
            </div>
            <div>
              <p style={{ fontSize: '13px', color: '#475569', margin: 0 }}>{r.department}</p>
              <p style={{ fontSize: '11px', color: '#94a3b8', margin: 0 }}>{r.role} · L{r.level}</p>
            </div>
            <div style={{ fontSize: '13px', fontWeight: '600', color: '#1e293b' }}>
              ${r.salary?.toLocaleString()}
            </div>
            <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
              {Object.keys(FLAG_META).map(k => r[k] && (
                <span key={k} style={{
                  fontSize: '10px', fontWeight: '600', padding: '3px 8px', borderRadius: '12px',
                  background: FLAG_META[k].bg, color: FLAG_META[k].color,
                  border: `1px solid ${FLAG_META[k].border}`
                }}>
                  {FLAG_META[k].label}
                </span>
              ))}
            </div>
            <div style={{ fontSize: '13px', fontWeight: '700', color: '#ef4444' }}>
              {r.priority_score}
            </div>
            <div>
              <p style={{ fontSize: '12px', fontWeight: '600', color: '#065f46', margin: 0 }}>
                ${r.fix_cost?.toLocaleString()}
              </p>
              <p style={{ fontSize: '11px', color: '#991b1b', margin: 0 }}>
                ${r.risk_cost?.toLocaleString()}
              </p>
            </div>
          </div>
        ))}
      </div>

      <EmployeeDetailDrawer employeeId={selectedId} onClose={() => setSelectedId(null)} />
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
