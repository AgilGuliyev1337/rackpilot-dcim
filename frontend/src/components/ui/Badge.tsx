import type { ReactNode } from 'react'
import { cn } from '../../lib/cn'
import type { DeviceStatus } from '../../types'

type Tone = 'green' | 'gray' | 'amber' | 'red' | 'blue' | 'neutral'

const TONES: Record<Tone, string> = {
  green:
    'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900',
  gray: 'bg-surface-200 text-surface-600 dark:bg-surface-800 dark:text-surface-400 border-surface-300 dark:border-surface-700',
  amber:
    'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400 border-amber-200 dark:border-amber-900',
  red: 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400 border-red-200 dark:border-red-900',
  blue: 'bg-accent-100 text-accent-700 dark:bg-accent-950 dark:text-accent-400 border-accent-200 dark:border-accent-900',
  neutral:
    'bg-surface-100 text-surface-600 dark:bg-surface-800/60 dark:text-surface-300 border-surface-200 dark:border-surface-700',
}

const STATUS_TONE: Record<DeviceStatus, Tone> = {
  active: 'green',
  inactive: 'gray',
  maintenance: 'amber',
  decommissioned: 'red',
}

export function Badge({ tone = 'neutral', children }: { tone?: Tone; children: ReactNode }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium',
        TONES[tone],
      )}
    >
      {children}
    </span>
  )
}

export function StatusBadge({ status }: { status: DeviceStatus }) {
  return <Badge tone={STATUS_TONE[status]}>{status}</Badge>
}
