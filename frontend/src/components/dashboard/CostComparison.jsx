import { motion } from 'framer-motion'
import CountUp from 'react-countup'
import { ResponsiveBar } from '@nivo/bar'
import { Wrench, ShieldAlert } from 'lucide-react'
import { formatCurrency } from '../../lib/utils'

export default function CostComparison({ fixCost, riskCost }) {
  const ratio = riskCost / fixCost
  const barData = [
    {
      category: 'Cost',
      'Fix Cost': fixCost,
      'Risk Cost': riskCost,
    },
  ]

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.4 }}
      className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm"
    >
      <h3 className="text-sm font-medium text-slate-700 mb-4">Fix Cost vs. Risk Cost</h3>

      {/* Two stat boxes */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="bg-emerald-50 rounded-lg p-3 border border-emerald-100">
          <div className="flex items-center gap-2 mb-1">
            <Wrench size={14} className="text-emerald-600" />
            <span className="text-[11px] font-medium text-emerald-700 uppercase">Fix Now</span>
          </div>
          <div className="text-xl font-bold text-emerald-700">
            $<CountUp end={fixCost} separator="," duration={1.5} />
          </div>
        </div>

        <div className="bg-red-50 rounded-lg p-3 border border-red-100">
          <div className="flex items-center gap-2 mb-1">
            <ShieldAlert size={14} className="text-red-600" />
            <span className="text-[11px] font-medium text-red-700 uppercase">Do Nothing</span>
          </div>
          <div className="text-xl font-bold text-red-700">
            $<CountUp end={riskCost} separator="," duration={1.5} />
          </div>
        </div>
      </div>

      {/* Bar chart */}
      <div className="h-28">
        <ResponsiveBar
          data={barData}
          keys={['Fix Cost', 'Risk Cost']}
          indexBy="category"
          layout="horizontal"
          margin={{ top: 0, right: 10, bottom: 0, left: 0 }}
          padding={0.4}
          groupMode="grouped"
          colors={['#10b981', '#ef4444']}
          borderRadius={4}
          enableLabel={false}
          enableGridX={false}
          enableGridY={false}
          axisTop={null}
          axisRight={null}
          axisBottom={null}
          axisLeft={null}
          animate={true}
          motionConfig="gentle"
          tooltip={({ id, value }) => (
            <div className="bg-slate-900 text-white text-xs px-3 py-1.5 rounded-lg shadow-lg">
              {id}: {formatCurrency(value)}
            </div>
          )}
        />
      </div>

      <p className="text-center text-xs text-slate-500 mt-2">
        Fixing costs <span className="font-semibold text-emerald-600">{ratio.toFixed(0)}× less</span> than ignoring
      </p>
    </motion.div>
  )
}
