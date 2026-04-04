import { Bell, Search } from 'lucide-react'

export default function Header({ title, subtitle }) {
  return (
    <header className="h-16 border-b border-slate-200 bg-white flex items-center justify-between px-8">
      <div>
        <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
        {subtitle && <p className="text-xs text-slate-500">{subtitle}</p>}
      </div>

      <div className="flex items-center gap-4">
        {/* Search */}
        <div className="flex items-center gap-2 bg-slate-100 rounded-lg px-3 py-2 w-64">
          <Search size={14} className="text-slate-400" />
          <input
            type="text"
            placeholder="Search employees, departments..."
            className="bg-transparent text-sm text-slate-700 outline-none w-full placeholder:text-slate-400"
          />
        </div>

        {/* Notifications */}
        <button className="relative p-2 hover:bg-slate-100 rounded-lg transition-colors">
          <Bell size={18} className="text-slate-500" />
          <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
            3
          </span>
        </button>
      </div>
    </header>
  )
}
