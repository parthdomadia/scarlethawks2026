import { NavLink } from 'react-router-dom'
import logoDark from '../../assets/logo-dark.png'

const navItems = [
  { to: '/', label: 'Dashboard', icon: '📊' },
  { to: '/gaps', label: 'Gap Analysis', icon: '⚖️' },
  { to: '/simulator', label: 'What-If', icon: '🎛️' },
  { to: '/ingest', label: 'Ingest Data', icon: '➕' },
  { to: '/settings', label: 'Settings', icon: '⚙️' },
]

export default function Sidebar() {
  return (
    <aside style={{
      width: '250px', height: '100vh', background: '#0f172a', color: 'white',
      display: 'flex', flexDirection: 'column', flexShrink: 0,
      position: 'sticky', top: 0, alignSelf: 'flex-start',
    }}>
      {/* Logo */}
      <div style={{ padding: '20px 24px', borderBottom: '1px solid #1e293b' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <img src={logoDark} alt="PayGap Radar" style={{ height: '80px', width: 'auto', display: 'block' }} />
          <div>
            <div style={{ fontSize: '15px', fontWeight: '600', letterSpacing: '-0.3px' }}>PayGap Radar</div>
            <div style={{ fontSize: '11px', color: '#64748b' }}>Pay Equity Intelligence</div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: '12px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
        {navItems.map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            style={({ isActive }) => ({
              display: 'flex', alignItems: 'center', gap: '10px',
              padding: '10px 14px', borderRadius: '10px',
              fontSize: '13px', fontWeight: '500',
              textDecoration: 'none', transition: 'all 0.2s',
              background: isActive ? 'rgba(139, 92, 246, 0.15)' : 'transparent',
              color: isActive ? '#c4b5fd' : '#94a3b8',
              border: isActive ? '1px solid rgba(139, 92, 246, 0.3)' : '1px solid transparent',
            })}
          >
            <span style={{ fontSize: '16px' }}>{item.icon}</span>
            {item.label}
          </NavLink>
        ))}
      </nav>

      {/* Footer */}
      <div style={{ padding: '16px', borderTop: '1px solid #1e293b' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '0 8px' }}>
          <div style={{
            width: '32px', height: '32px', borderRadius: '50%', background: '#1e293b',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '12px', fontWeight: '600',
          }}>
            HR
          </div>
          <div>
            <div style={{ fontSize: '13px', fontWeight: '500' }}>HR Admin</div>
            <div style={{ fontSize: '11px', color: '#64748b' }}>TechCorp Inc.</div>
          </div>
        </div>
      </div>
    </aside>
  )
}
