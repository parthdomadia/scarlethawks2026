import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Sidebar from './components/layout/Sidebar'
import Dashboard from './pages/Dashboard'
import Heatmap from './pages/Heatmap'
import GapDetail from './pages/GapDetail'
import Leaderboard from './pages/Leaderboard'
import Simulator from './pages/Simulator'
import Compression from './pages/Compression'
import EmployeeView from './pages/EmployeeView'

export default function App() {
  return (
    <BrowserRouter>
      <div style={{ display: 'flex', minHeight: '100vh' }}>
        <Sidebar />
        <main style={{ flex: 1, display: 'flex', flexDirection: 'column', background: '#f8fafc' }}>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/heatmap" element={<Heatmap />} />
            <Route path="/gaps" element={<GapDetail />} />
            <Route path="/leaderboard" element={<Leaderboard />} />
            <Route path="/simulator" element={<Simulator />} />
            <Route path="/compression" element={<Compression />} />
            <Route path="/employee" element={<EmployeeView />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  )
}
