import type { LucideIcon } from 'lucide-react'
import { Inbox } from 'lucide-react'
import type { ReactNode } from 'react'

interface EmptyStateProps {
  icon?: LucideIcon
  title: string
  description?: ReactNode
  action?: ReactNode
}

export function EmptyState({ icon: Icon = Inbox, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
      <div className="rounded-full bg-surface-100 p-3 text-surface-400 dark:bg-surface-800 dark:text-surface-500">
        <Icon size={24} />
      </div>
      <p className="text-sm font-medium text-surface-700 dark:text-surface-200">{title}</p>
      {description && (
        <p className="max-w-sm text-xs text-surface-500 dark:text-surface-400">{description}</p>
      )}
      {action && <div className="mt-2">{action}</div>}
    </div>
  )
}
