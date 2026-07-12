import { forwardRef, useId, type InputHTMLAttributes } from 'react'
import { cn } from '../../lib/cn'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  hint?: string
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, error, hint, className, id, ...rest },
  ref,
) {
  const autoId = useId()
  const inputId = id ?? autoId
  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label
          htmlFor={inputId}
          className="text-xs font-medium text-surface-600 dark:text-surface-300"
        >
          {label}
        </label>
      )}
      <input
        ref={ref}
        id={inputId}
        className={cn(
          'h-9 rounded-md border bg-white px-3 text-sm text-surface-900 placeholder:text-surface-400',
          'dark:bg-surface-900 dark:text-surface-100 dark:placeholder:text-surface-500',
          'focus:outline-none focus:ring-2 focus:ring-accent-500/50',
          error
            ? 'border-red-400 dark:border-red-700'
            : 'border-surface-300 dark:border-surface-700',
          className,
        )}
        {...rest}
      />
      {error ? (
        <p className="text-xs text-red-600 dark:text-red-400">{error}</p>
      ) : hint ? (
        <p className="text-xs text-surface-500 dark:text-surface-400">{hint}</p>
      ) : null}
    </div>
  )
})
