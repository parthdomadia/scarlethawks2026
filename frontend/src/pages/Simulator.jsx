import Header from '../components/layout/Header'

export default function Simulator() {
  return (
    <div className="flex flex-col flex-1">
      <Header title="Simulator" subtitle="Coming soon" />
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">🚧</div>
          <p className="text-slate-500 text-lg font-medium">Building Simulator...</p>
          <p className="text-slate-400 text-sm mt-1">This screen is next in the pipeline</p>
        </div>
      </div>
    </div>
  )
}
