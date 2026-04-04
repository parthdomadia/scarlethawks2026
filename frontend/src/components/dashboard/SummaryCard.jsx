import CountUp from 'react-countup'
import { motion } from 'framer-motion'

export default function SummaryCard({ title, value, icon: Icon, description, index = 0, suffix = '%', color = 'violet' }) {
  const colorMap = {
    red:    { bg: 'bg-red-50',    icon: 'bg-red-100 text-red-600',    border: 'border-red-100' },
    orange: { bg: 'bg-orange-50', icon: 'bg-orange-100 text-orange-600', border: 'border-orange-100' },
    yellow: { bg: 'bg-amber-50',  icon: 'bg-amber-100 text-amber-600',  border: 'border-amber-100' },
    green:  { bg: 'bg-emerald-50', icon: 'bg-emerald-100 text-emerald-600', border: 'border-emerald-100' },
    violet: { bg: 'bg-violet-50', icon: 'bg-violet-100 text-violet-600', border: 'border-violet-100' },
    blue:   { bg: 'bg-blue-50',   icon: 'bg-blue-100 text-blue-600',   border: 'border-blue-100' },
  }

  const colors = colorMap[color] || colorMap.violet

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.1 }}
      className={`bg-white rounded-xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition-shadow duration-300`}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">{title}</p>
          <div className="mt-2 flex items-baseline gap-1">
            <span className="text-3xl font-bold text-slate-900">
              <CountUp end={value} decimals={1} duration={1.5} delay={index * 0.15} />
            </span>
            <span className="text-lg font-semibold text-slate-400">{suffix}</span>
          </div>
          <p className="mt-1.5 text-xs text-slate-500">{description}</p>
        </div>

        <div className={`p-2.5 rounded-lg ${colors.icon}`}>
          <Icon size={20} />
        </div>
      </div>
    </motion.div>
  )
}
