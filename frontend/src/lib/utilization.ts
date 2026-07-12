/** Utilization color band shared by floor plan and 3D view. */
export function utilizationBand(pct: number): 'low' | 'mid' | 'high' {
  if (pct >= 90) return 'high'
  if (pct >= 70) return 'mid'
  return 'low'
}

export const UTIL_FILL_CLASS: Record<'low' | 'mid' | 'high', string> = {
  low: 'bg-emerald-500/80 border-emerald-600',
  mid: 'bg-amber-500/80 border-amber-600',
  high: 'bg-red-500/80 border-red-600',
}

/** Hex colors for the 3D view (three.js materials). */
export const UTIL_HEX: Record<'low' | 'mid' | 'high', string> = {
  low: '#10b981',
  mid: '#f59e0b',
  high: '#ef4444',
}

/** Power status ("normal" | "warning" | "critical" | "unknown") → bar color. */
export const POWER_BAR_CLASS: Record<string, string> = {
  normal: 'bg-emerald-500',
  warning: 'bg-amber-500',
  critical: 'bg-red-500',
  unknown: 'bg-surface-400',
}

export const POWER_TEXT_CLASS: Record<string, string> = {
  normal: 'text-emerald-600 dark:text-emerald-400',
  warning: 'text-amber-600 dark:text-amber-400',
  critical: 'text-red-600 dark:text-red-400',
  unknown: 'text-surface-500',
}

export function formatWatts(w: number | null | undefined): string {
  if (w == null) return '—'
  return w >= 1000 ? `${(w / 1000).toFixed(1)} kW` : `${w} W`
}
