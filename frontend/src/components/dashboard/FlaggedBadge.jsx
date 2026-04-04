import CountUp from 'react-countup'
import { motion } from 'framer-motion'
import { AlertTriangle, Users } from 'lucide-react'

export default function FlaggedBadge({ flaggedCount, totalEmployees }) {
  const percentage = ((flaggedCount / totalEmployees) * 100).toFixed(1)

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.3 }}
      className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm"
    >
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 rounded-lg bg-red-100">
          <AlertTriangle size={18} className="text-red-600" />
        </div>
        <h3 className="text-sm font-medium text-slate-700">Flagged Pay Gaps</h3>
      </div>

      <div className="flex items-end justify-between">
        <div>
          <div className="text-4xl font-bold text-red-600">
            <CountUp end={flaggedCount} duration={1.5} />
          </div>
          <p className="text-xs text-slate-500 mt-1">employees flagged</p>
        </div>

        <div className="text-right">
          <div className="flex items-center gap-1.5 text-slate-500">
            <Users size={14} />
            <span className="text-sm font-medium">
              <CountUp end={totalEmployees} duration={1.5} />
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">{percentage}% affected</p>
        </div>
      </div>

      {/* Progress bar */}
      <div className="mt-4 h-2 bg-slate-100 rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 1, delay: 0.5 }}
          className="h-full bg-gradient-to-r from-red-500 to-orange-500 rounded-full"
        />
      </div>
    </motion.div>
  )
}
