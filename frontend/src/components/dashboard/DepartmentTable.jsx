import { motion } from 'framer-motion'
import { getScoreColor, getScoreLabel, formatPercent } from '../../lib/utils'
import { TrendingUp, TrendingDown, Minus, ChevronRight } from 'lucide-react'

function TrendBadge({ trend }) {
  if (trend === 'improving') {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
        <TrendingUp size={12} /> Improving
      </span>
    )
  }
  if (trend === 'declining') {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-red-600 bg-red-50 px-2 py-0.5 rounded-full">
        <TrendingDown size={12} /> Declining
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
      <Minus size={12} /> Stable
    </span>
  )
}

export default function DepartmentTable({ departments }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.5 }}
      className="bg-white rounded-xl border border-slate-200 shadow-sm"
    >
      <div className="px-5 py-4 border-b border-slate-100">
        <h3 className="text-sm font-medium text-slate-700">Department Equity Scores</h3>
      </div>

      <div className="divide-y divide-slate-100">
        {departments.map((dept, i) => {
          const color = getScoreColor(dept.score)
          return (
            <motion.div
              key={dept.name}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3, delay: 0.6 + i * 0.08 }}
              className="flex items-center justify-between px-5 py-3.5 hover:bg-slate-50 transition-colors cursor-pointer group"
            >
              <div className="flex items-center gap-4">
                {/* Score badge */}
                <div className={`w-10 h-10 rounded-lg ${color.bg} ${color.text} flex items-center justify-center font-bold text-sm ${color.border} border`}>
                  {dept.score}
                </div>

                <div>
                  <p className="text-sm font-medium text-slate-900">{dept.name}</p>
                  <p className="text-xs text-slate-500">{dept.employee_count} employees</p>
                </div>
              </div>

              <div className="flex items-center gap-4">
                {/* Flagged count */}
                {dept.flagged > 0 && (
                  <span className="text-xs font-medium text-red-600 bg-red-50 px-2 py-0.5 rounded-full">
                    {dept.flagged} flagged
                  </span>
                )}

                {/* Gender gap */}
                <div className="text-right w-20">
                  <p className="text-xs text-slate-400">Gender gap</p>
                  <p className="text-sm font-semibold text-slate-700">{formatPercent(dept.gender_gap)}</p>
                </div>

                <TrendBadge trend={dept.trend} />

                <ChevronRight size={16} className="text-slate-300 group-hover:text-slate-500 transition-colors" />
              </div>
            </motion.div>
          )
        })}
      </div>
    </motion.div>
  )
}
