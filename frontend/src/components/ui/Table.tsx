import { useMemo, useState, type ReactNode } from 'react'
import { ChevronDown, ChevronUp, ChevronsUpDown } from 'lucide-react'
import { cn } from '../../lib/cn'

export interface Column<T> {
  key: string
  header: string
  sortable?: boolean
  render?: (row: T) => ReactNode
  sortValue?: (row: T) => string | number | null
  className?: string
}

interface TableProps<T> {
  columns: Column<T>[]
  rows: T[]
  rowKey: (row: T) => string | number
  onRowClick?: (row: T) => void
  emptyState?: ReactNode
}

export function Table<T>({ columns, rows, rowKey, onRowClick, emptyState }: TableProps<T>) {
  const [sortKey, setSortKey] = useState<string | null>(null)
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')

  const sorted = useMemo(() => {
    if (!sortKey) return rows
    const col = columns.find((c) => c.key === sortKey)
    if (!col) return rows
    const getValue =
      col.sortValue ?? ((row: T) => (row as Record<string, unknown>)[col.key] as string | number | null)
    return [...rows].sort((a, b) => {
      const va = getValue(a)
      const vb = getValue(b)
      if (va == null && vb == null) return 0
      if (va == null) return 1
      if (vb == null) return -1
      const cmp =
        typeof va === 'number' && typeof vb === 'number'
          ? va - vb
          : String(va).localeCompare(String(vb), undefined, { numeric: true })
      return sortDir === 'asc' ? cmp : -cmp
    })
  }, [rows, columns, sortKey, sortDir])

  const toggleSort = (key: string) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortDir('asc')
    }
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-surface-200 text-xs uppercase tracking-wide text-surface-500 dark:border-surface-800 dark:text-surface-400">
            {columns.map((col) => (
              <th key={col.key} className={cn('px-3 py-2.5 font-medium', col.className)}>
                {col.sortable ? (
                  <button
                    className="inline-flex items-center gap-1 hover:text-surface-900 dark:hover:text-surface-100"
                    onClick={() => toggleSort(col.key)}
                  >
                    {col.header}
                    {sortKey === col.key ? (
                      sortDir === 'asc' ? (
                        <ChevronUp size={12} />
                      ) : (
                        <ChevronDown size={12} />
                      )
                    ) : (
                      <ChevronsUpDown size={12} className="opacity-50" />
                    )}
                  </button>
                ) : (
                  col.header
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sorted.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="px-3 py-8">
                {emptyState ?? (
                  <p className="text-center text-sm text-surface-500">No records</p>
                )}
              </td>
            </tr>
          ) : (
            sorted.map((row) => (
              <tr
                key={rowKey(row)}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                className={cn(
                  'border-b border-surface-100 last:border-0 dark:border-surface-800/60',
                  onRowClick &&
                    'cursor-pointer transition-colors hover:bg-surface-50 dark:hover:bg-surface-800/50',
                )}
              >
                {columns.map((col) => (
                  <td key={col.key} className={cn('px-3 py-2.5', col.className)}>
                    {col.render
                      ? col.render(row)
                      : String((row as Record<string, unknown>)[col.key] ?? '—')}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  )
}
