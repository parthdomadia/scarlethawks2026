import { useEffect, useState } from 'react'
import { useGapDetail } from '../hooks/useGapDetail'

const CATEGORY_COLORS = {
  gender_gap:               { bg: '#fef2f2', border: '#ef4444', text: '#991b1b' },
  tenure_compression:       { bg: '#fff7ed', border: '#f97316', text: '#9a3412' },
  role_gap:                 { bg: '#fefce8', border: '#eab308', text: '#854d0e' },
  performance_misalignment: { bg: '#eff6ff', border: '#3b82f6', text: '#1e40af' },
}

export default function EmployeeDetailDrawer({ employeeId, onClose }) {
  const { data, loading, error } = useGapDetail(employeeId)

  useEffect(() => {
    if (!employeeId) return
    function onKey(e) { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [employeeId, onClose])

  if (!employeeId) return null

  return (
    <>
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.45)', zIndex: 40,
        }}
      />
      <div
        style={{
          position: 'fixed', top: 0, right: 0, height: '100vh', width: '560px',
          background: 'white', borderLeft: '1px solid #e2e8f0',
          boxShadow: '-4px 0 24px rgba(15,23,42,0.12)',
          overflowY: 'auto', zIndex: 50,
          transform: 'translateX(0)', transition: 'transform 220ms ease',
          fontFamily: 'Inter, system-ui, sans-serif',
        }}
      >
        {loading && <div style={{ padding: '40px', color: '#64748b' }}>Loading…</div>}
        {error && <div style={{ padding: '40px', color: '#ef4444' }}>Error: {error}</div>}
        {data && <DrawerContent data={data} onClose={onClose} />}
      </div>
    </>
  )
}

function DrawerContent({ data, onClose }) {
  return (
    <div>
      {/* Header */}
      <div style={{ padding: '22px 26px', borderBottom: '1px solid #f1f5f9', position: 'sticky', top: 0, background: 'white', zIndex: 1 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#1e293b', margin: 0 }}>{data.name}</h2>
            <p style={{ fontSize: '12px', color: '#94a3b8', margin: '2px 0 0' }}>{data.employee_id}</p>
          </div>
          <button
            onClick={onClose}
            style={{
              border: 'none', background: 'transparent', fontSize: '22px',
              color: '#64748b', cursor: 'pointer', lineHeight: 1, padding: '0 4px',
            }}
            aria-label="Close"
          >×</button>
        </div>
        <p style={{ fontSize: '12px', color: '#475569', margin: '10px 0 0' }}>
          {data.department} · {data.role} · L{data.level}
        </p>
        <div style={{ display: 'flex', gap: '18px', marginTop: '10px', fontSize: '12px', color: '#64748b', flexWrap: 'wrap' }}>
          <span><strong style={{ color: '#1e293b' }}>${data.salary?.toLocaleString()}</strong> salary</span>
          <span><strong style={{ color: '#1e293b' }}>{data.tenure_years}yr</strong> tenure</span>
          <span><strong style={{ color: '#1e293b' }}>{data.performance_score}</strong> perf</span>
          <span><strong style={{ color: '#1e293b' }}>{data.gender}</strong></span>
        </div>
      </div>

      {/* Body */}
      <div style={{ padding: '20px 26px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {(data.categories || []).length === 0 && (
          <div style={{ color: '#94a3b8', fontSize: '13px' }}>No flagged categories.</div>
        )}
        {(data.categories || []).map(cat => (
          <CategoryCard key={cat.category} cat={cat} />
        ))}
      </div>
    </div>
  )
}

function CategoryCard({ cat }) {
  const colors = CATEGORY_COLORS[cat.category] || { bg: '#f8fafc', border: '#94a3b8', text: '#334155' }
  const [expanded, setExpanded] = useState(false)
  const peers = cat.comparison_individuals || []
  const shown = expanded ? peers : peers.slice(0, 5)
  const more = peers.length - shown.length

  return (
    <div style={{
      background: colors.bg, borderLeft: `4px solid ${colors.border}`,
      borderRadius: '10px', padding: '14px 16px',
    }}>
      {/* Row 1 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ fontSize: '14px', fontWeight: 700, color: colors.text }}>{cat.label}</div>
        <span style={{
          fontSize: '12px', fontWeight: 700, padding: '4px 10px', borderRadius: '999px',
          background: 'white', color: colors.text, border: `1px solid ${colors.border}`,
        }}>
          -{cat.gap_percent}%
        </span>
      </div>

      {/* Row 2 */}
      <div style={{ display: 'flex', gap: '12px', marginTop: '10px' }}>
        <div style={{ flex: 1, background: 'white', borderRadius: '8px', padding: '10px 12px' }}>
          <p style={{ fontSize: '10px', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px', margin: 0 }}>This employee</p>
          <p style={{ fontSize: '16px', fontWeight: 700, color: '#1e293b', margin: '2px 0 0' }}>${cat.employee_salary?.toLocaleString()}</p>
        </div>
        <div style={{ flex: 1, background: 'white', borderRadius: '8px', padding: '10px 12px' }}>
          <p style={{ fontSize: '10px', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px', margin: 0 }}>{cat.comparison_entity}</p>
          <p style={{ fontSize: '16px', fontWeight: 700, color: '#1e293b', margin: '2px 0 0' }}>${cat.comparison_salary?.toLocaleString()}</p>
        </div>
      </div>

      {/* Row 3 */}
      <p style={{ fontSize: '12px', fontStyle: 'italic', color: '#475569', margin: '12px 0 0' }}>{cat.reason}</p>

      {/* Row 4 — peers */}
      {peers.length > 0 && (
        <div style={{ marginTop: '12px' }}>
          <div style={{
            display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', gap: '6px',
            fontSize: '10px', fontWeight: 600, color: '#94a3b8',
            textTransform: 'uppercase', letterSpacing: '0.4px',
            padding: '6px 8px', borderBottom: `1px solid ${colors.border}33`,
          }}>
            <div>Peer</div><div>Salary</div><div>Tenure</div><div>Perf</div>
          </div>
          {shown.map(p => (
            <div key={p.employee_id} style={{
              display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', gap: '6px',
              fontSize: '12px', color: '#334155', padding: '6px 8px',
            }}>
              <div style={{ fontWeight: 600 }}>{p.name}</div>
              <div>${p.salary?.toLocaleString()}</div>
              <div>{p.tenure_years}yr</div>
              <div>{p.performance_score}</div>
            </div>
          ))}
          {more > 0 && !expanded && (
            <button
              onClick={() => setExpanded(true)}
              style={{
                border: 'none', background: 'transparent', color: colors.text,
                fontSize: '11px', fontWeight: 600, cursor: 'pointer', padding: '6px 8px',
              }}
            >and {more} more…</button>
          )}
        </div>
      )}
    </div>
  )
}
