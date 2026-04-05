import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useDashboard } from '../hooks/useDashboard'

// Count-up animation hook — animates from 0 to target over ~900ms with easing.
function useCountUp(target, duration = 900) {
  const [val, setVal] = useState(0)
  useEffect(() => {
    if (target == null) return
    let raf
    const start = performance.now()
    const tick = (now) => {
      const t = Math.min(1, (now - start) / duration)
      const eased = 1 - Math.pow(1 - t, 3) // easeOutCubic
      setVal(target * eased)
      if (t < 1) raf = requestAnimationFrame(tick)
      else setVal(target)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [target, duration])
  return val
}

function formatRelative(iso) {
  if (!iso) return 'Never analyzed'
  const then = new Date(iso).getTime()
  const now = Date.now()
  const secs = Math.max(0, Math.round((now - then) / 1000))
  if (secs < 60) return `Last analyzed ${secs}s ago`
  const mins = Math.round(secs / 60)
  if (mins < 60) return `Last analyzed ${mins} min${mins === 1 ? '' : 's'} ago`
  const hrs = Math.round(mins / 60)
  if (hrs < 24) return `Last analyzed ${hrs} hr${hrs === 1 ? '' : 's'} ago`
  const days = Math.round(hrs / 24)
  return `Last analyzed ${days} day${days === 1 ? '' : 's'} ago`
}

const WarningIcon = ({ size = 16, color = '#ef4444' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}>
    <path d="M12 2L1 21h22L12 2zm0 6l7.5 13h-15L12 8zm-1 4v4h2v-4h-2zm0 5v2h2v-2h-2z"
      fill={color} />
  </svg>
)

export default function Dashboard() {
  const { data, loading, error } = useDashboard()
  const animatedScore = useCountUp(data?.company_score ?? 0)

  if (loading) return <div style={{ padding: '40px', color: '#64748b' }}>Loading dashboard...</div>
  if (error) return <div style={{ padding: '40px', color: '#ef4444' }}>Error: {error}</div>

  const totalPayroll = data.employees.reduce((s, e) => s + e.salary, 0)
  const avgSalary = Math.round(totalPayroll / data.employees.length)
  const locationCount = [...new Set(data.employees.map(e => e.location))].length
  const scoreColor = data.company_score >= 70 ? '#10b981' : data.company_score >= 50 ? '#eab308' : '#ef4444'
  const scoreDisplay = Math.round(animatedScore)
  const arcDeg = animatedScore * 1.8

  const showCritical = data.flagged_gaps >= 20
  const pctAffected = (data.flagged_gaps / data.total_employees) * 100

  // Sort departments worst-first for demo impact
  const sortedDepts = [...data.department_scores].sort((a, b) => a.score - b.score)

  return (
    <div style={{ padding: '32px', fontFamily: 'Inter, system-ui, sans-serif', overflowY: 'auto', flex: 1 }}>
      {/* Header */}
      <div style={{ marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: '700', color: '#1e293b', margin: 0 }}>Company Overview</h1>
          <p style={{ fontSize: '13px', color: '#94a3b8', marginTop: '4px' }}>
            {data.total_employees} employees across {data.department_scores.length} departments
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#64748b' }}>
          <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981' }} />
          {formatRelative(data.last_analyzed)} · {data.total_employees.toLocaleString()} employees scanned
        </div>
      </div>

      {/* Critical gaps hero banner */}
      {showCritical && (
        <Link to="/gaps" style={{ textDecoration: 'none', color: 'inherit' }}>
          <div style={{
            marginBottom: '20px', padding: '16px 20px', borderRadius: '12px',
            background: 'linear-gradient(90deg, #fef2f2 0%, #fff7ed 100%)',
            border: '1px solid #fecaca', display: 'flex', alignItems: 'center', gap: '14px',
            cursor: 'pointer', transition: 'transform 0.15s ease, box-shadow 0.15s ease',
          }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'translateX(2px)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(239,68,68,0.12)' }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'translateX(0)'; e.currentTarget.style.boxShadow = 'none' }}
          >
            <div style={{
              width: '40px', height: '40px', borderRadius: '10px', background: '#fef2f2',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              border: '1px solid #fecaca',
            }}>
              <WarningIcon size={20} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '14px', fontWeight: '700', color: '#991b1b' }}>
                {data.flagged_gaps} employees are currently underpaid by more than 10%
              </div>
              <div style={{ fontSize: '12px', color: '#7f1d1d', marginTop: '2px' }}>
                Estimated fix cost <strong>${data.estimated_fix_cost.toLocaleString()}</strong> ·
                {' '}Risk of inaction <strong>${data.estimated_risk_cost.toLocaleString()}</strong>
              </div>
            </div>
            <span style={{ fontSize: '12px', fontWeight: 600, color: '#991b1b' }}>Review →</span>
          </div>
        </Link>
      )}

      {/* Top row: Score + 4 cards */}
      <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: '20px', marginBottom: '20px' }}>
        {/* Score Gauge */}
        <div style={{
          background: 'white', borderRadius: '16px', border: '1px solid #e2e8f0',
          padding: '28px', textAlign: 'center', boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
        }}>
          <p style={{ fontSize: '12px', color: '#94a3b8', fontWeight: '500', marginBottom: '16px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Equity Score
          </p>
          {/* SVG semicircle gauge */}
          <div style={{ width: '180px', height: '100px', margin: '0 auto 8px', position: 'relative' }}>
            <svg width="180" height="100" viewBox="0 0 180 100">
              {/* Track */}
              <path d="M 15 90 A 75 75 0 0 1 165 90" stroke="#e2e8f0" strokeWidth="14" fill="none" strokeLinecap="round" />
              {/* Value arc */}
              <path
                d="M 15 90 A 75 75 0 0 1 165 90"
                stroke={scoreColor}
                strokeWidth="14"
                fill="none"
                strokeLinecap="round"
                strokeDasharray={`${(arcDeg / 180) * 235.6} 235.6`}
                style={{ transition: 'stroke 0.3s ease' }}
              />
            </svg>
          </div>
          <div style={{ fontSize: '48px', fontWeight: '800', color: '#1e293b', lineHeight: 1 }}>
            {scoreDisplay}
          </div>
          <span style={{
            display: 'inline-block', marginTop: '8px', padding: '3px 12px', borderRadius: '20px',
            fontSize: '11px', fontWeight: '600',
            background: data.company_score >= 70 ? '#ecfdf5' : data.company_score >= 50 ? '#fefce8' : '#fef2f2',
            color: data.company_score >= 70 ? '#065f46' : data.company_score >= 50 ? '#854d0e' : '#991b1b',
          }}>
            {data.company_score >= 85 ? 'Excellent' : data.company_score >= 70 ? 'Good' : data.company_score >= 55 ? 'Moderate' : data.company_score >= 40 ? 'Low' : 'Critical'}
          </span>
        </div>

        {/* 4 Summary Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
          <StatCard label="Gender Pay Gap" value={`${data.summary.gender_gap_pct.toFixed(1)}%`} pct={data.summary.gender_gap_pct} maxPct={25} desc="Avg gap between male & female in same roles" color="#ef4444" />
          <StatCard label="Tenure Gap" value={`${data.summary.tenure_gap_pct.toFixed(1)}%`} pct={data.summary.tenure_gap_pct} maxPct={25} desc="New hires earn more than loyal employees" color="#f97316" />
          <StatCard label="Role Level Gap" value={`${data.summary.role_gap_pct.toFixed(1)}%`} pct={data.summary.role_gap_pct} maxPct={25} desc="Pay variance within same role and level" color="#eab308" />
          <StatCard label="Performance Alignment" value={`${data.summary.performance_alignment_pct.toFixed(1)}%`} pct={data.summary.performance_alignment_pct} maxPct={100} desc="Higher performers earning more" color="#10b981" />
        </div>
      </div>

      {/* Middle row: Flagged + Cost */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
        {/* Flagged Badge */}
        <Link to="/gaps" style={{ textDecoration: 'none', color: 'inherit', display: 'block', height: '100%' }}>
        <div
          style={{ background: 'white', borderRadius: '14px', border: '1px solid #e2e8f0', padding: '22px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)', cursor: 'pointer', transition: 'transform 0.15s ease, border-color 0.15s ease, box-shadow 0.15s ease', height: '100%', boxSizing: 'border-box' }}
          onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.borderColor = '#fecaca'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.06)' }}
          onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.04)' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
            <WarningIcon size={16} />
            <span style={{ fontSize: '13px', fontWeight: '600', color: '#64748b' }}>Flagged Pay Gaps</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
            <div>
              <div style={{ fontSize: '42px', fontWeight: '800', color: '#ef4444', lineHeight: 1 }}>{data.flagged_gaps}</div>
              <p style={{ fontSize: '12px', color: '#94a3b8', marginTop: '4px' }}>employees flagged</p>
            </div>
            <div style={{ textAlign: 'right' }}>
              <p style={{ fontSize: '14px', fontWeight: '600', color: '#64748b' }}>{data.total_employees} total</p>
              <p style={{ fontSize: '12px', color: '#94a3b8' }}>{pctAffected.toFixed(1)}% affected</p>
            </div>
          </div>
          {/* Progress bar */}
          <div style={{ marginTop: '14px', height: '8px', background: '#f1f5f9', borderRadius: '4px', overflow: 'hidden' }}>
            <div style={{
              height: '100%', borderRadius: '4px',
              width: `${pctAffected}%`,
              background: 'linear-gradient(90deg, #ef4444, #f97316)',
              transition: 'width 1s ease-out'
            }} />
          </div>
        </div>
        </Link>

        {/* Cost Comparison */}
        <div style={{ background: 'white', borderRadius: '14px', border: '1px solid #e2e8f0', padding: '22px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
          <p style={{ fontSize: '13px', fontWeight: '600', color: '#64748b', marginBottom: '14px' }}>Fix Cost vs. Risk Cost</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
            <div style={{ background: '#ecfdf5', borderRadius: '10px', padding: '14px', border: '1px solid #a7f3d0' }}>
              <p style={{ fontSize: '11px', fontWeight: '600', color: '#065f46', textTransform: 'uppercase' }}>Fix Now</p>
              <p style={{ fontSize: '22px', fontWeight: '800', color: '#065f46', marginTop: '4px' }}>${data.estimated_fix_cost.toLocaleString()}</p>
            </div>
            <div style={{ background: '#fef2f2', borderRadius: '10px', padding: '14px', border: '1px solid #fecaca' }}>
              <p style={{ fontSize: '11px', fontWeight: '600', color: '#991b1b', textTransform: 'uppercase' }}>Do Nothing</p>
              <p style={{ fontSize: '22px', fontWeight: '800', color: '#991b1b', marginTop: '4px' }}>${data.estimated_risk_cost.toLocaleString()}</p>
            </div>
          </div>
          {/* Visual bar comparison */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '11px', color: '#065f46', width: '40px' }}>Fix</span>
              <div style={{ flex: 1, height: '12px', background: '#f1f5f9', borderRadius: '6px', overflow: 'hidden' }}>
                <div style={{ height: '100%', background: '#10b981', borderRadius: '6px', width: `${(data.estimated_fix_cost / data.estimated_risk_cost) * 100}%` }} />
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '11px', color: '#991b1b', width: '40px' }}>Risk</span>
              <div style={{ flex: 1, height: '12px', background: '#f1f5f9', borderRadius: '6px', overflow: 'hidden' }}>
                <div style={{ height: '100%', background: '#ef4444', borderRadius: '6px', width: '100%' }} />
              </div>
            </div>
          </div>
          <p style={{ textAlign: 'center', fontSize: '12px', color: '#64748b', marginTop: '12px' }}>
            Fixing costs <strong style={{ color: '#10b981' }}>{Math.round(data.estimated_risk_cost / data.estimated_fix_cost)}x less</strong> than ignoring
          </p>
        </div>
      </div>

      {/* Department Table */}
      <div style={{ background: 'white', borderRadius: '14px', border: '1px solid #e2e8f0', marginBottom: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
        <div style={{ padding: '16px 22px', borderBottom: '1px solid #f1f5f9' }}>
          <h3 style={{ fontSize: '14px', fontWeight: '600', color: '#475569', margin: 0 }}>Department Equity Scores</h3>
        </div>
        {sortedDepts.map(dept => (
          <div key={dept.name} style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            padding: '14px 22px', borderBottom: '1px solid #f8fafc', cursor: 'pointer',
          }}
            onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <div style={{
                width: '40px', height: '40px', borderRadius: '10px',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontWeight: '700', fontSize: '14px',
                background: dept.score >= 70 ? '#ecfdf5' : dept.score >= 50 ? '#fefce8' : '#fef2f2',
                color: dept.score >= 70 ? '#065f46' : dept.score >= 50 ? '#854d0e' : '#991b1b',
                border: `1px solid ${dept.score >= 70 ? '#a7f3d0' : dept.score >= 50 ? '#fde68a' : '#fecaca'}`,
              }}>
                {dept.score}
              </div>
              <div>
                <p style={{ fontWeight: '600', color: '#1e293b', fontSize: '14px', margin: 0 }}>{dept.name}</p>
                <p style={{ fontSize: '12px', color: '#94a3b8', margin: 0 }}>{dept.employee_count} employees</p>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              {dept.flagged > 0 && (
                <span style={{ fontSize: '12px', fontWeight: '500', color: '#ef4444', background: '#fef2f2', padding: '3px 10px', borderRadius: '20px' }}>
                  {dept.flagged} flagged
                </span>
              )}
              <div style={{ textAlign: 'right', width: '80px' }}>
                <p style={{ fontSize: '11px', color: '#94a3b8', margin: 0 }}>Gender gap</p>
                <p style={{ fontSize: '13px', fontWeight: '600', color: '#475569', margin: 0 }}>{dept.gender_gap.toFixed(1)}%</p>
              </div>
              <span style={{
                fontSize: '12px', fontWeight: '500', padding: '3px 10px', borderRadius: '20px',
                background: dept.trend === 'improving' ? '#ecfdf5' : dept.trend === 'declining' ? '#fef2f2' : '#f8fafc',
                color: dept.trend === 'improving' ? '#065f46' : dept.trend === 'declining' ? '#991b1b' : '#64748b',
              }}>
                {dept.trend === 'improving' ? '↑ Improving' : dept.trend === 'declining' ? '↓ Declining' : '→ Stable'}
              </span>
              <span style={{ color: '#cbd5e1', fontSize: '16px' }}>›</span>
            </div>
          </div>
        ))}
      </div>

      {/* Footer Stats Bar */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        background: '#0f172a', color: 'white', borderRadius: '12px', padding: '16px 24px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981' }} />
          <span style={{ fontSize: '12px', color: '#94a3b8' }}>Live analysis</span>
        </div>
        <div style={{ display: 'flex', gap: '40px' }}>
          <FooterStat label="Total Payroll" value={`$${(totalPayroll / 1000000).toFixed(1)}M`} />
          <FooterStat label="Avg Salary" value={`$${Math.round(avgSalary / 1000)}K`} />
          <FooterStat label="Locations" value={locationCount} />
          <FooterStat label="Departments" value={data.department_scores.length} />
        </div>
      </div>
    </div>
  )
}

function StatCard({ label, value, desc, color, pct = 0, maxPct = 100 }) {
  const fillPct = Math.max(4, Math.min(100, (pct / maxPct) * 100))
  return (
    <div style={{
      background: 'white', borderRadius: '12px', border: '1px solid #e2e8f0',
      padding: '18px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
    }}>
      <p style={{ fontSize: '11px', fontWeight: '600', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px', margin: 0 }}>{label}</p>
      <div style={{ marginTop: '8px', display: 'flex', alignItems: 'baseline', gap: '2px' }}>
        <span style={{ fontSize: '30px', fontWeight: '800', color: '#1e293b' }}>{value}</span>
      </div>
      <p style={{ fontSize: '11px', color: '#94a3b8', marginTop: '6px' }}>{desc}</p>
      {/* Color accent bar — scaled to metric */}
      <div style={{ marginTop: '10px', height: '3px', background: '#f1f5f9', borderRadius: '2px', overflow: 'hidden' }}>
        <div style={{ height: '100%', background: color, borderRadius: '2px', width: `${fillPct}%`, transition: 'width 1s ease-out' }} />
      </div>
    </div>
  )
}

function FooterStat({ label, value }) {
  return (
    <div style={{ textAlign: 'center' }}>
      <p style={{ fontSize: '14px', fontWeight: '600', margin: 0 }}>{value}</p>
      <p style={{ fontSize: '11px', color: '#94a3b8', margin: 0 }}>{label}</p>
    </div>
  )
}
