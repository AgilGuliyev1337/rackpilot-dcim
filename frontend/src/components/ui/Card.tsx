import type { HTMLAttributes, ReactNode } from 'react'
import { cn } from '../../lib/cn'

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode
}

export function Card({ className, children, ...rest }: CardProps) {
  return (
    <div
      className={cn(
        'rounded-lg border border-surface-200 bg-white dark:border-surface-800 dark:bg-surface-900',
        className,
      )}
      {...rest}
    >
      {children}
    </div>
  )
}

export function CardHeader({
  title,
  actions,
}: {
  title: ReactNode
  actions?: ReactNode
}) {
  return (
    <div className="flex items-center justify-between border-b border-surface-200 px-4 py-3 dark:border-surface-800">
      <h3 className="text-sm font-semibold">{title}</h3>
      {actions}
    </div>
  )
}
