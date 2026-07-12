import { Fragment, useMemo, useState } from 'react'
import { ChevronDown, ChevronRight, ScrollText } from 'lucide-react'
import { listAuditLogs } from '../api/audit'
import { useAsync } from '../hooks/useAsync'
import { useI18n } from '../context/I18nContext'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Badge } from '../components/ui/Badge'
import { Input } from '../components/ui/Input'
import { Select } from '../components/ui/Select'
import { TableSkeleton } from '../components/ui/Skeleton'
import { EmptyState } from '../components/ui/EmptyState'
import { timeAgo } from '../lib/format'
import { cn } from '../lib/cn'
import type { AuditLog } from '../types'

const PAGE_SIZE = 25

const ACTION_TONES: Record<string, 'green' | 'blue' | 'red' | 'neutral'> = {
  create: 'green',
  update: 'blue',
  delete: 'red',
  import: 'neutral',
}

const ACTIONS = ['create', 'update', 'delete', 'import']
const ENTITY_TYPES = ['datacenter', 'room', 'rack', 'device']

const HIDDEN_FIELDS = new Set(['updated_at', 'created_at', 'id', 'organization_id'])

function changedFields(log: AuditLog): string[] {
  if (log.action === 'update' && log.old_values && log.new_values) {
    return Object.keys(log.new_values).filter(
      (k) =>
        !HIDDEN_FIELDS.has(k) &&
        JSON.stringify(log.old_values?.[k]) !== JSON.stringify(log.new_values?.[k]),
    )
  }
  const source = log.new_values ?? log.old_values
  return source
    ? Object.keys(source).filter(
        (k) => !HIDDEN_FIELDS.has(k) && source[k] !== null && source[k] !== '',
      )
    : []
}

function DiffView({ log }: { log: AuditLog }) {
  const fields = changedFields(log)
  if (fields.length === 0) {
    return <p className="px-4 py-3 text-xs text-surface-500">No field data recorded.</p>
  }
  const fmt = (v: unknown) =>
    v === null || v === undefined || v === '' ? '—' : typeof v === 'object' ? JSON.stringify(v) : String(v)

  return (
    <div className="overflow-x-auto px-4 py-3">
      <table className="w-full max-w-2xl text-xs">
        <thead>
          <tr className="text-left text-surface-400">
            <th className="w-40 py-1 pr-3 font-medium">Field</th>
            <th className="py-1 pr-3 font-medium">Old value</th>
            <th className="py-1 font-medium">New value</th>
          </tr>
        </thead>
        <tbody>
          {fields.map((field) => {
            const oldV = log.old_values?.[field]
            const newV = log.new_values?.[field]
            const changed =
              log.action === 'update' && JSON.stringify(oldV) !== JSON.stringify(newV)
            return (
              <tr key={field} className="border-t border-surface-100 dark:border-surface-800">
                <td className="py-1.5 pr-3 font-mono text-surface-500">{field}</td>
                <td
                  className={cn(
                    'py-1.5 pr-3',
                    changed && 'bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-400',
                  )}
                >
                  {fmt(oldV)}
                </td>
                <td
                  className={cn(
                    'py-1.5',
                    changed &&
                      'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400',
                  )}
                >
                  {fmt(newV)}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

export function AuditLogPage() {
  const { t } = useI18n()
  const [action, setAction] = useState('')
  const [entityType, setEntityType] = useState('')
  const [userEmail, setUserEmail] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [page, setPage] = useState(1)
  const [expanded, setExpanded] = useState<number | null>(null)

  const filters = useMemo(
    () => ({
      action: action || undefined,
      entity_type: entityType || undefined,
      user_email: userEmail || undefined,
      date_from: dateFrom ? `${dateFrom}T00:00:00` : undefined,
      date_to: dateTo ? `${dateTo}T23:59:59` : undefined,
      page,
      page_size: PAGE_SIZE,
    }),
    [action, entityType, userEmail, dateFrom, dateTo, page],
  )

  const { data, loading } = useAsync(() => listAuditLogs(filters), [filters])

  const total = data?.total ?? 0
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const resetPage = () => setPage(1)

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-lg font-semibold">{t('page.audit')}</h1>

      <Card className="p-3">
        <div className="grid gap-2 md:grid-cols-5">
          <Select
            placeholder="All actions"
            options={ACTIONS.map((a) => ({ value: a, label: a }))}
            value={action}
            onChange={(e) => {
              setAction(e.target.value)
              resetPage()
            }}
          />
          <Select
            placeholder="All entities"
            options={ENTITY_TYPES.map((t) => ({ value: t, label: t }))}
            value={entityType}
            onChange={(e) => {
              setEntityType(e.target.value)
              resetPage()
            }}
          />
          <Input
            placeholder="Filter by user email…"
            value={userEmail}
            onChange={(e) => {
              setUserEmail(e.target.value)
              resetPage()
            }}
          />
          <Input
            type="date"
            aria-label="From date"
            value={dateFrom}
            onChange={(e) => {
              setDateFrom(e.target.value)
              resetPage()
            }}
          />
          <Input
            type="date"
            aria-label="To date"
            value={dateTo}
            onChange={(e) => {
              setDateTo(e.target.value)
              resetPage()
            }}
          />
        </div>
      </Card>

      <Card>
        {loading && !data ? (
          <TableSkeleton rows={10} cols={5} />
        ) : !data || data.items.length === 0 ? (
          <EmptyState
            icon={ScrollText}
            title="No audit entries match"
            description="Try widening the filters."
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-surface-200 text-xs uppercase tracking-wide text-surface-500 dark:border-surface-800">
                    <th className="w-8 px-3 py-2.5" />
                    <th className="px-3 py-2.5 font-medium">When</th>
                    <th className="px-3 py-2.5 font-medium">User</th>
                    <th className="px-3 py-2.5 font-medium">Action</th>
                    <th className="px-3 py-2.5 font-medium">Entity</th>
                    <th className="px-3 py-2.5 font-medium">Name</th>
                  </tr>
                </thead>
                <tbody>
                  {data.items.map((log) => (
                    <Fragment key={log.id}>
                      <tr
                        onClick={() => setExpanded(expanded === log.id ? null : log.id)}
                        className="cursor-pointer border-b border-surface-100 transition-colors hover:bg-surface-50 dark:border-surface-800/60 dark:hover:bg-surface-800/50"
                      >
                        <td className="px-3 py-2.5 text-surface-400">
                          {expanded === log.id ? (
                            <ChevronDown size={14} />
                          ) : (
                            <ChevronRight size={14} />
                          )}
                        </td>
                        <td
                          className="whitespace-nowrap px-3 py-2.5 text-xs text-surface-500"
                          title={new Date(log.timestamp).toLocaleString()}
                        >
                          {timeAgo(log.timestamp)}
                        </td>
                        <td className="px-3 py-2.5">{log.user_email}</td>
                        <td className="px-3 py-2.5">
                          <Badge tone={ACTION_TONES[log.action] ?? 'neutral'}>{log.action}</Badge>
                        </td>
                        <td className="px-3 py-2.5 text-surface-500">{log.entity_type}</td>
                        <td className="px-3 py-2.5 font-medium">{log.entity_name}</td>
                      </tr>
                      {expanded === log.id && (
                        <tr className="border-b border-surface-100 bg-surface-50/60 dark:border-surface-800/60 dark:bg-surface-800/30">
                          <td colSpan={6}>
                            <DiffView log={log} />
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex items-center justify-between border-t border-surface-200 px-3 py-2 text-xs text-surface-500 dark:border-surface-800">
              <span>
                {total} entr{total === 1 ? 'y' : 'ies'} · page {page} of {totalPages}
              </span>
              <div className="flex gap-1">
                <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                  Previous
                </Button>
                <Button variant="secondary" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
                  Next
                </Button>
              </div>
            </div>
          </>
        )}
      </Card>
    </div>
  )
}
