import { useTheme } from '../context/ThemeContext'

export default function Settings() {
  const { dark, toggle } = useTheme()

  return (
    <div style={{ padding: '32px', fontFamily: 'Inter, system-ui, sans-serif', overflowY: 'auto', flex: 1 }}>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '22px', fontWeight: 700, color: '#1e293b', margin: 0 }}>Settings</h1>
        <p style={{ fontSize: '13px', color: '#94a3b8', marginTop: '4px' }}>
          Application preferences.
        </p>
      </div>

      <div style={{
        background: 'white', borderRadius: '16px', border: '1px solid #e2e8f0',
        padding: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)', maxWidth: '560px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: '14px', fontWeight: 600, color: '#1e293b' }}>Dark Mode</div>
            <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '2px' }}>
              Switch the application to a dark color scheme.
            </div>
          </div>
          <button
            onClick={toggle}
            aria-pressed={dark}
            style={{
              position: 'relative', width: '48px', height: '26px', borderRadius: '999px',
              border: 'none', cursor: 'pointer', padding: 0,
              background: dark ? '#6366f1' : '#cbd5e1', transition: 'background 200ms ease',
            }}
          >
            <span style={{
              position: 'absolute', top: '3px', left: dark ? '25px' : '3px',
              width: '20px', height: '20px', borderRadius: '50%', background: 'white',
              transition: 'left 200ms ease', boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
            }} />
          </button>
        </div>
      </div>
    </div>
  )
}
