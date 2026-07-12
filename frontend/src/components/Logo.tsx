import { Boxes } from 'lucide-react'
import { cn } from '../lib/cn'

interface LogoProps {
  /** icon square size in px */
  size?: number
  className?: string
}

/** Brand lockup: icon + bold "RackPilot" + a small muted "DCIM" pill. */
export function Logo({ size = 16, className }: LogoProps) {
  return (
    <span className={cn('inline-flex items-center gap-2', className)}>
      <span className="rounded-md bg-accent-600 p-1.5 text-white">
        <Boxes size={size} />
      </span>
      <span className="flex items-center gap-1.5">
        <span className="font-semibold tracking-tight">RackPilot</span>
        <span className="rounded bg-surface-200 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-surface-500 dark:bg-surface-700 dark:text-surface-300">
          DCIM
        </span>
      </span>
    </span>
  )
}
