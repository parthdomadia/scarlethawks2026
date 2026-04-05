import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Sidebar from './components/layout/Sidebar'
import Dashboard from './pages/Dashboard'
import Heatmap from './pages/Heatmap'
import GapDetail from './pages/GapDetail'
import Leaderboard from './pages/Leaderboard'
import Simulator from './pages/Simulator'

export default function App() {
  return (
    <BrowserRouter>
      <div style={{ display: 'flex', minHeight: '100vh' }}>
        <Sidebar />
        <main style={{ flex: 1, display: 'flex', flexDirection: 'column', background: '#eef2f7' }}>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/heatmap" element={<Heatmap />} />
            <Route path="/gaps" element={<GapDetail />} />
            <Route path="/leaderboard" element={<Leaderboard />} />
            <Route path="/simulator" element={<Simulator />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  )
}
