import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs) {
  return twMerge(clsx(inputs))
}

export function getScoreColor(score) {
  if (score >= 85) return { bg: 'bg-emerald-100', text: 'text-emerald-700', border: 'border-emerald-300', hex: '#10b981' }
  if (score >= 70) return { bg: 'bg-green-100', text: 'text-green-700', border: 'border-green-300', hex: '#22c55e' }
  if (score >= 55) return { bg: 'bg-yellow-100', text: 'text-yellow-700', border: 'border-yellow-300', hex: '#eab308' }
  if (score >= 40) return { bg: 'bg-orange-100', text: 'text-orange-700', border: 'border-orange-300', hex: '#f97316' }
  return { bg: 'bg-red-100', text: 'text-red-700', border: 'border-red-300', hex: '#ef4444' }
}

export function getScoreLabel(score) {
  if (score >= 85) return 'Excellent'
  if (score >= 70) return 'Good'
  if (score >= 55) return 'Moderate'
  if (score >= 40) return 'Low'
  return 'Critical'
}

export function getTrendIcon(trend) {
  if (trend === 'improving') return '↑'
  if (trend === 'declining') return '↓'
  return '→'
}

export function formatCurrency(amount) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

export function formatPercent(value) {
  return `${value.toFixed(1)}%`
}
