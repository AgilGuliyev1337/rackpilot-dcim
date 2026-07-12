import { Link } from 'react-router-dom'
import {
  HardDrive,
  Server,
  Network,
  Database,
  Zap,
  ShieldAlert,
  Activity,
  PackageX,
} from 'lucide-react'
import { getDashboard } from '../api/dashboard'
import { useAsync } from '../hooks/useAsync'
import { Card, CardHeader } from '../components/ui/Card'
import { Skeleton } from '../components/ui/Skeleton'
import { EmptyState } from '../components/ui/EmptyState'
import { Badge } from '../components/ui/Badge'
import { daysUntil, formatDate, timeAgo, deviceTypeLabel } from '../lib/format'
import { formatWatts } from '../lib/utilization'
import { useI18n } from '../context/I18nContext'
import type { LucideIcon } from 'lucide-react'

function StatCard({
  label,
  value,
  icon: Icon,
}: {
  label: string
  value: number
  icon: LucideIcon
}) {
  return (
    <Card className="flex items-center gap-3 p-4">
      <div className="rounded-md bg-accent-600/10 p-2.5 text-accent-600 dark:text-accent-400">
        <Icon size={18} />
      </div>
      <div>
        <p className="text-xs text-surface-500 dark:text-surface-400">{label}</p>
        <p className="text-xl font-semibold tabular-nums">{value}</p>
      </div>
    </Card>
  )
}

const ACTION_TONES: Record<string, 'green' | 'blue' | 'red'> = {
  create: 'green',
  update: 'blue',
  delete: 'red',
}

export function DashboardPage() {
  const { data, loading } = useAsync(getDashboard)
  const { t } = useI18n()

  if (loading || !data) {
    return (
      <div className="flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-20" />
          ))}
        </div>
        <Skeleton className="h-24" />
        <div className="grid gap-4 lg:grid-cols-2">
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
        </div>
      </div>
    )
  }

  const g = data.devices_by_group
  const util = data.rack_utilization_percent
  const powerPct = data.total_power_capacity_watts
    ? Math.round((data.total_power_watts / data.total_power_capacity_watts) * 100)
    : 0

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-lg font-semibold">{t('dash.title')}</h1>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        <StatCard label={t('dash.totalDevices')} value={data.total_devices} icon={HardDrive} />
        <StatCard label={t('dash.servers')} value={g.servers} icon={Server} />
        <StatCard label={t('dash.network')} value={g.network} icon={Network} />
        <StatCard label={t('dash.storage')} value={g.storage} icon={Database} />
        <StatCard label={t('dash.power')} value={g.power} icon={Zap} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card className="p-4">
          <div className="mb-2 flex items-center justify-between text-sm">
            <span className="font-medium">{t('dash.rackUtil')}</span>
            <span className="tabular-nums text-surface-500 dark:text-surface-400">
              {util}%
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-surface-200 dark:bg-surface-800">
            <div
              className="h-full rounded-full bg-accent-600 transition-all"
              style={{ width: `${Math.min(util, 100)}%` }}
            />
          </div>
        </Card>

        <Card className="p-4">
          <div className="mb-2 flex items-center justify-between text-sm">
            <span className="font-medium">{t('dash.powerConsumption')}</span>
            <span className="tabular-nums text-surface-500 dark:text-surface-400">
              {formatWatts(data.total_power_watts)} / {formatWatts(data.total_power_capacity_watts)}
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-surface-200 dark:bg-surface-800">
            <div
              className="h-full rounded-full bg-teal-500 transition-all"
              style={{ width: `${Math.min(powerPct, 100)}%` }}
            />
          </div>
        </Card>
      </div>

      {data.low_stock.length > 0 && (
        <Card>
          <CardHeader
            title={
              <span className="flex items-center gap-2">
                <PackageX size={15} className="text-red-500" />
                {t('dash.lowStock')} ({data.low_stock.length})
              </span>
            }
          />
          <ul className="divide-y divide-surface-100 dark:divide-surface-800/60">
            {data.low_stock.map((s) => (
              <li key={s.id} className="flex items-center justify-between gap-2 px-4 py-2.5">
                <Link
                  to={`/warehouses/stock/${s.id}`}
                  className="truncate text-sm font-medium hover:text-accent-600 dark:hover:text-accent-400"
                >
                  {s.name} <span className="text-xs text-surface-500">({s.sku})</span>
                </Link>
                <Badge tone="red">
                  {s.quantity} / {s.min_threshold} min
                </Badge>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader
            title={
              <span className="flex items-center gap-2">
                <ShieldAlert size={15} className="text-amber-500" />
                {t('dash.warrantyExpiring')}
              </span>
            }
          />
          {data.warranty_expiring_soon.length === 0 ? (
            <EmptyState title={t('dash.noWarranties')} />
          ) : (
            <ul className="divide-y divide-surface-100 dark:divide-surface-800/60">
              {data.warranty_expiring_soon.map((d) => {
                const days = daysUntil(d.warranty_expiry)
                return (
                  <li key={d.id} className="flex items-center justify-between gap-2 px-4 py-2.5">
                    <div className="min-w-0">
                      <Link
                        to={`/assets/${d.id}`}
                        className="block truncate text-sm font-medium hover:text-accent-600 dark:hover:text-accent-400"
                      >
                        {d.name}
                      </Link>
                      <p className="truncate text-xs text-surface-500">
                        {d.asset_tag} · {deviceTypeLabel(d.device_type)} ·{' '}
                        {formatDate(d.warranty_expiry)}
                      </p>
                    </div>
                    <Badge tone={days <= 30 ? 'red' : 'amber'}>
                      {days <= 0 ? 'expired' : `${days}d left`}
                    </Badge>
                  </li>
                )
              })}
            </ul>
          )}
        </Card>

        <Card>
          <CardHeader
            title={
              <span className="flex items-center gap-2">
                <Activity size={15} className="text-accent-500" />
                {t('dash.recentActivity')}
              </span>
            }
          />
          {data.recent_audit_logs.length === 0 ? (
            <EmptyState title={t('dash.noActivity')} />
          ) : (
            <ul className="divide-y divide-surface-100 dark:divide-surface-800/60">
              {data.recent_audit_logs.map((log) => (
                <li key={log.id} className="flex items-center justify-between gap-2 px-4 py-2.5">
                  <div className="min-w-0">
                    <p className="truncate text-sm">
                      <span className="font-medium">{log.user_email}</span>{' '}
                      <Badge tone={ACTION_TONES[log.action] ?? 'neutral'}>{log.action}</Badge>{' '}
                      <span className="text-surface-500">{log.entity_type}</span>{' '}
                      <span className="font-medium">{log.entity_name}</span>
                    </p>
                  </div>
                  <span className="shrink-0 text-xs text-surface-400">
                    {timeAgo(log.timestamp)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  )
}
