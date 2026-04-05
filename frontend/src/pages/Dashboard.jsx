import { Link } from 'react-router-dom'
import { useDashboard } from '../hooks/useDashboard'

export default function Dashboard() {
  const { data, loading, error } = useDashboard()

  if (loading) return <div style={{ padding: '40px', color: '#64748b' }}>Loading dashboard...</div>
  if (error) return <div style={{ padding: '40px', color: '#ef4444' }}>Error: {error}</div>

  const totalPayroll = data.employees.reduce((s, e) => s + e.salary, 0)
  const avgSalary = Math.round(totalPayroll / data.employees.length)
  const locationCount = [...new Set(data.employees.map(e => e.location))].length
  const scoreColor = data.company_score >= 70 ? '#10b981' : data.company_score >= 50 ? '#eab308' : '#ef4444'

  return (
    <div style={{ padding: '32px', fontFamily: 'Inter, system-ui, sans-serif', overflowY: 'auto', flex: 1 }}>
      {/* Header */}
      <div style={{ marginBottom: '28px' }}>
        <h1 style={{ fontSize: '22px', fontWeight: '700', color: '#1e293b', margin: 0 }}>Company Overview</h1>
        <p style={{ fontSize: '13px', color: '#94a3b8', marginTop: '4px' }}>
          {data.total_employees} employees across {data.department_scores.length} departments
        </p>
      </div>

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
          {/* Circular gauge */}
          <div style={{ position: 'relative', width: '160px', height: '80px', margin: '0 auto 12px', overflow: 'hidden' }}>
            <div style={{
              width: '160px', height: '160px', borderRadius: '50%',
              background: `conic-gradient(${scoreColor} 0deg, ${scoreColor} ${data.company_score * 1.8}deg, #e2e8f0 ${data.company_score * 1.8}deg, #e2e8f0 180deg, transparent 180deg)`,
              position: 'absolute', top: 0
            }} />
            <div style={{
              width: '120px', height: '120px', borderRadius: '50%', background: 'white',
              position: 'absolute', top: '20px', left: '20px'
            }} />
          </div>
          <div style={{ fontSize: '48px', fontWeight: '800', color: '#1e293b', lineHeight: 1 }}>
            {data.company_score}
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
          <StatCard label="Gender Pay Gap" value={`${data.summary.gender_gap_pct.toFixed(1)}%`} desc="Avg gap between male & female in same roles" color="#ef4444" bg="#fef2f2" />
          <StatCard label="Tenure Gap" value={`${data.summary.tenure_gap_pct.toFixed(1)}%`} desc="New hires earn more than loyal employees" color="#f97316" bg="#fff7ed" />
          <StatCard label="Role Level Gap" value={`${data.summary.role_gap_pct.toFixed(1)}%`} desc="Pay variance within same role and level" color="#eab308" bg="#fefce8" />
          <StatCard label="Performance Alignment" value={`${data.summary.performance_alignment_pct.toFixed(1)}%`} desc="Higher performers earning more" color="#10b981" bg="#ecfdf5" />
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
            <span style={{ fontSize: '16px' }}>&#9888;</span>
            <span style={{ fontSize: '13px', fontWeight: '600', color: '#64748b' }}>Flagged Pay Gaps</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
            <div>
              <div style={{ fontSize: '42px', fontWeight: '800', color: '#ef4444', lineHeight: 1 }}>{data.flagged_gaps}</div>
              <p style={{ fontSize: '12px', color: '#94a3b8', marginTop: '4px' }}>employees flagged</p>
            </div>
            <div style={{ textAlign: 'right' }}>
              <p style={{ fontSize: '14px', fontWeight: '600', color: '#64748b' }}>{data.total_employees} total</p>
              <p style={{ fontSize: '12px', color: '#94a3b8' }}>{((data.flagged_gaps / data.total_employees) * 100).toFixed(1)}% affected</p>
            </div>
          </div>
          {/* Progress bar */}
          <div style={{ marginTop: '14px', height: '8px', background: '#f1f5f9', borderRadius: '4px', overflow: 'hidden' }}>
            <div style={{
              height: '100%', borderRadius: '4px',
              width: `${(data.flagged_gaps / data.total_employees) * 100}%`,
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
        {data.department_scores.map(dept => (
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

function StatCard({ label, value, desc, color, bg }) {
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
      {/* Color accent bar */}
      <div style={{ marginTop: '10px', height: '3px', background: '#f1f5f9', borderRadius: '2px' }}>
        <div style={{ height: '100%', background: color, borderRadius: '2px', width: '60%' }} />
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
