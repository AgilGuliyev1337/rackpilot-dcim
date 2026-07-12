import { Check } from 'lucide-react'
import { LIFECYCLE_STAGES, type LifecycleStatus } from '../types'
import { cn } from '../lib/cn'

interface LifecycleStepperProps {
  current: LifecycleStatus
}

/** Horizontal 8-stage lifecycle indicator; stages up to and including current
 *  are marked done, the current one highlighted. */
export function LifecycleStepper({ current }: LifecycleStepperProps) {
  const currentIndex = LIFECYCLE_STAGES.indexOf(current)
  return (
    <ol className="flex w-full items-center overflow-x-auto">
      {LIFECYCLE_STAGES.map((stage, i) => {
        const done = i < currentIndex
        const active = i === currentIndex
        return (
          <li key={stage} className="flex flex-1 items-center">
            <div className="flex flex-col items-center gap-1">
              <span
                className={cn(
                  'flex h-6 w-6 items-center justify-center rounded-full border text-[10px] font-semibold',
                  active &&
                    'border-accent-600 bg-accent-600 text-white',
                  done &&
                    'border-accent-500 bg-accent-500/20 text-accent-600 dark:text-accent-400',
                  !done && !active &&
                    'border-surface-300 text-surface-400 dark:border-surface-700',
                )}
              >
                {done ? <Check size={12} /> : i + 1}
              </span>
              <span
                className={cn(
                  'whitespace-nowrap text-[10px] capitalize',
                  active
                    ? 'font-semibold text-surface-900 dark:text-surface-100'
                    : 'text-surface-500',
                )}
              >
                {stage}
              </span>
            </div>
            {i < LIFECYCLE_STAGES.length - 1 && (
              <span
                className={cn(
                  'mx-1 h-0.5 flex-1',
                  i < currentIndex ? 'bg-accent-500' : 'bg-surface-200 dark:bg-surface-700',
                )}
              />
            )}
          </li>
        )
      })}
    </ol>
  )
}
