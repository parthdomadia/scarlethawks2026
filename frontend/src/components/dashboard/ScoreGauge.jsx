import GaugeComponent from 'react-gauge-component'
import CountUp from 'react-countup'
import { motion } from 'framer-motion'
import { getScoreLabel, getScoreColor } from '../../lib/utils'

export default function ScoreGauge({ score }) {
  const label = getScoreLabel(score)
  const color = getScoreColor(score)

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5 }}
      className="bg-white rounded-2xl border border-slate-200 p-6 flex flex-col items-center shadow-sm"
    >
      <h3 className="text-sm font-medium text-slate-500 mb-2">Company Equity Score</h3>

      <div className="w-64 h-44">
        <GaugeComponent
          type="semicircle"
          arc={{
            colorArray: ['#ef4444', '#f97316', '#eab308', '#22c55e', '#10b981'],
            subArcs: [
              { limit: 25 },
              { limit: 45 },
              { limit: 65 },
              { limit: 80 },
              { limit: 100 },
            ],
            padding: 0.02,
            width: 0.2,
          }}
          pointer={{
            type: 'needle',
            elastic: true,
            animationDelay: 200,
            color: '#334155',
            length: 0.7,
            width: 8,
          }}
          value={score}
          minValue={0}
          maxValue={100}
          labels={{
            valueLabel: {
              hide: true,
            },
            tickLabels: {
              type: 'outer',
              defaultTickValueConfig: {
                style: { fontSize: 10, fill: '#94a3b8' },
              },
              ticks: [
                { value: 0 },
                { value: 25 },
                { value: 50 },
                { value: 75 },
                { value: 100 },
              ],
            },
          }}
        />
      </div>

      <div className="text-center -mt-4">
        <div className="text-5xl font-bold text-slate-900">
          <CountUp end={score} duration={2} />
        </div>
        <span className={`inline-block mt-2 px-3 py-1 rounded-full text-xs font-semibold ${color.bg} ${color.text}`}>
          {label}
        </span>
      </div>
    </motion.div>
  )
}
