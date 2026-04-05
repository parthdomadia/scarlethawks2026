import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Sidebar from './components/layout/Sidebar'
import Dashboard from './pages/Dashboard'
import GapDetail from './pages/GapDetail'
import Simulator from './pages/Simulator'
import Ingest from './pages/Ingest'
import Settings from './pages/Settings'

export default function App() {
  return (
    <BrowserRouter>
      <div style={{ display: 'flex', minHeight: '100vh' }}>
        <Sidebar />
        <main style={{ flex: 1, display: 'flex', flexDirection: 'column', background: '#eef2f7' }}>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/gaps" element={<GapDetail />} />
            <Route path="/simulator" element={<Simulator />} />
            <Route path="/ingest" element={<Ingest />} />
            <Route path="/settings" element={<Settings />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  )
}
