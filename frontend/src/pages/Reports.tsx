import { Link } from 'react-router-dom'
import { Download, PackageSearch, ShieldAlert, Gauge, Recycle, Boxes } from 'lucide-react'
import { getReports, type Reports } from '../api/reports'
import { useAsync } from '../hooks/useAsync'
import { useI18n } from '../context/I18nContext'
import { Card, CardHeader } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Badge } from '../components/ui/Badge'
import { Skeleton } from '../components/ui/Skeleton'
import { downloadCsv } from '../lib/download'
import { daysUntil, deviceTypeLabel, formatDate } from '../lib/format'
import { POWER_TEXT_CLASS, formatWatts } from '../lib/utilization'
import { cn } from '../lib/cn'

function SummaryTile({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-md bg-surface-50 px-3 py-2 text-center dark:bg-surface-800/60">
      <p className="text-base font-semibold tabular-nums">{value}</p>
      <p className="text-[11px] text-surface-500">{label}</p>
    </div>
  )
}

export function ReportsPage() {
  const { t } = useI18n()
  const { data, loading } = useAsync(getReports)

  if (loading || !data) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-64" />
        <Skeleton className="h-64" />
        <Skeleton className="h-64" />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-lg font-semibold">{t('page.reports')}</h1>
      <LifecycleBreakdown data={data} />
      <InventoryReport data={data} />
      <WarrantyReport data={data} />
      <CapacityReport data={data} />
      <StockLevelsReport data={data} />
    </div>
  )
}

function StockLevelsReport({ data }: { data: Reports }) {
  const low = data.stock_levels.filter((r) => r.low).length
  if (data.stock_levels.length === 0) return null
  return (
    <Card>
      <CardHeader
        title={
          <span className="flex items-center gap-2">
            <Boxes size={15} className="text-accent-500" />
            Stock levels
          </span>
        }
        actions={
          <Button
            variant="secondary"
            size="sm"
            onClick={() =>
              downloadCsv(
                data.stock_levels.map((r) => ({
                  name: r.name,
                  sku: r.sku,
                  category: r.category,
                  warehouse: r.warehouse,
                  quantity: r.quantity,
                  min_threshold: r.min_threshold,
                  unit: r.unit,
                  low: r.low ? 'yes' : 'no',
                })),
                'report-stock-levels.csv',
              )
            }
          >
            <Download size={13} /> CSV
          </Button>
        }
      />
      <div className="grid grid-cols-2 gap-2 p-3 sm:max-w-xs">
        <SummaryTile label="Stock items" value={data.stock_levels.length} />
        <SummaryTile label="Low stock" value={low} />
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-surface-200 text-xs uppercase tracking-wide text-surface-500 dark:border-surface-800">
              <th className="px-4 py-2 font-medium">Item</th>
              <th className="px-4 py-2 font-medium">SKU</th>
              <th className="px-4 py-2 font-medium">Warehouse</th>
              <th className="px-4 py-2 text-right font-medium">Quantity</th>
              <th className="px-4 py-2 text-right font-medium">Threshold</th>
              <th className="px-4 py-2 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {data.stock_levels.map((r) => (
              <tr
                key={r.id}
                className={cn(
                  'border-b border-surface-100 last:border-0 dark:border-surface-800/60',
                  r.low && 'bg-red-50/60 dark:bg-red-950/20',
                )}
              >
                <td className="px-4 py-2">
                  <Link to={`/warehouses/stock/${r.id}`} className="font-medium hover:text-accent-600 dark:hover:text-accent-400">
                    {r.name}
                  </Link>
                </td>
                <td className="px-4 py-2 font-mono text-xs">{r.sku}</td>
                <td className="px-4 py-2 text-xs text-surface-500">{r.warehouse}</td>
                <td className="px-4 py-2 text-right tabular-nums">{r.quantity} {r.unit}</td>
                <td className="px-4 py-2 text-right tabular-nums">{r.min_threshold}</td>
                <td className="px-4 py-2">
                  <Badge tone={r.low ? 'red' : 'green'}>{r.low ? 'low' : 'ok'}</Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  )
}

function LifecycleBreakdown({ data }: { data: Reports }) {
  const total = data.lifecycle.reduce((s, r) => s + r.count, 0)
  return (
    <Card>
      <CardHeader
        title={
          <span className="flex items-center gap-2">
            <Recycle size={15} className="text-accent-500" />
            Lifecycle breakdown
          </span>
        }
      />
      <div className="flex flex-wrap gap-2 p-4">
        {data.lifecycle.map((row) => (
          <div
            key={row.lifecycle_status}
            className="flex items-center gap-2 rounded-md border border-surface-200 px-3 py-1.5 text-xs dark:border-surface-700"
          >
            <span className="capitalize text-surface-600 dark:text-surface-300">
              {row.lifecycle_status}
            </span>
            <span className="rounded bg-surface-100 px-1.5 py-0.5 font-semibold tabular-nums dark:bg-surface-800">
              {row.count}
            </span>
          </div>
        ))}
        <div className="ml-auto self-center text-xs text-surface-400">{total} total</div>
      </div>
    </Card>
  )
}

function InventoryReport({ data }: { data: Reports }) {
  const totalDevices = data.inventory.reduce((s, r) => s + r.count, 0)
  const vendors = new Set(data.inventory.map((r) => r.vendor)).size

  return (
    <Card>
      <CardHeader
        title={
          <span className="flex items-center gap-2">
            <PackageSearch size={15} className="text-accent-500" />
            Inventory by type &amp; vendor
          </span>
        }
        actions={
          <Button
            variant="secondary"
            size="sm"
            onClick={() =>
              downloadCsv(
                data.inventory.map((r) => ({
                  device_type: r.device_type,
                  vendor: r.vendor,
                  count: r.count,
                })),
                'report-inventory.csv',
              )
            }
          >
            <Download size={13} /> CSV
          </Button>
        }
      />
      <div className="grid grid-cols-2 gap-2 p-3 sm:max-w-xs">
        <SummaryTile label="Total devices" value={totalDevices} />
        <SummaryTile label="Vendors" value={vendors} />
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-surface-200 text-xs uppercase tracking-wide text-surface-500 dark:border-surface-800">
              <th className="px-4 py-2 font-medium">Type</th>
              <th className="px-4 py-2 font-medium">Vendor</th>
              <th className="px-4 py-2 text-right font-medium">Count</th>
              <th className="w-1/3 px-4 py-2 font-medium">Share</th>
            </tr>
          </thead>
          <tbody>
            {data.inventory.map((row, i) => (
              <tr key={i} className="border-b border-surface-100 last:border-0 dark:border-surface-800/60">
                <td className="px-4 py-2">
                  <Badge tone="neutral">{deviceTypeLabel(row.device_type)}</Badge>
                </td>
                <td className="px-4 py-2">{row.vendor}</td>
                <td className="px-4 py-2 text-right tabular-nums">{row.count}</td>
                <td className="px-4 py-2">
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-100 dark:bg-surface-800">
                    <div
                      className="h-full rounded-full bg-accent-500"
                      style={{ width: `${(row.count / totalDevices) * 100}%` }}
                    />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  )
}

function WarrantyReport({ data }: { data: Reports }) {
  const expired = data.warranty.filter((r) => daysUntil(r.warranty_expiry) < 0).length
  const soon = data.warranty.filter((r) => {
    const d = daysUntil(r.warranty_expiry)
    return d >= 0 && d <= 90
  }).length

  return (
    <Card>
      <CardHeader
        title={
          <span className="flex items-center gap-2">
            <ShieldAlert size={15} className="text-amber-500" />
            Warranty report
          </span>
        }
        actions={
          <Button
            variant="secondary"
            size="sm"
            onClick={() =>
              downloadCsv(
                data.warranty.map((r) => ({
                  name: r.name,
                  asset_tag: r.asset_tag,
                  vendor: r.vendor ?? '',
                  model: r.model ?? '',
                  device_type: r.device_type,
                  warranty_expiry: r.warranty_expiry,
                  days_left: daysUntil(r.warranty_expiry),
                })),
                'report-warranty.csv',
              )
            }
          >
            <Download size={13} /> CSV
          </Button>
        }
      />
      <div className="grid grid-cols-3 gap-2 p-3 sm:max-w-md">
        <SummaryTile label="With warranty" value={data.warranty.length} />
        <SummaryTile label="Expired" value={expired} />
        <SummaryTile label="< 90 days" value={soon} />
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-surface-200 text-xs uppercase tracking-wide text-surface-500 dark:border-surface-800">
              <th className="px-4 py-2 font-medium">Device</th>
              <th className="px-4 py-2 font-medium">Tag</th>
              <th className="px-4 py-2 font-medium">Vendor / Model</th>
              <th className="px-4 py-2 font-medium">Expiry</th>
              <th className="px-4 py-2 text-right font-medium">Days left</th>
            </tr>
          </thead>
          <tbody>
            {data.warranty.map((row) => {
              const days = daysUntil(row.warranty_expiry)
              const state = days < 0 ? 'expired' : days <= 90 ? 'soon' : 'ok'
              return (
                <tr
                  key={row.id}
                  className={cn(
                    'border-b border-surface-100 last:border-0 dark:border-surface-800/60',
                    state === 'expired' && 'bg-red-50/60 dark:bg-red-950/20',
                    state === 'soon' && 'bg-amber-50/60 dark:bg-amber-950/20',
                  )}
                >
                  <td className="px-4 py-2">
                    <Link
                      to={`/assets/${row.id}`}
                      className="font-medium hover:text-accent-600 dark:hover:text-accent-400"
                    >
                      {row.name}
                    </Link>
                  </td>
                  <td className="px-4 py-2 font-mono text-xs">{row.asset_tag}</td>
                  <td className="px-4 py-2 text-xs">
                    {[row.vendor, row.model].filter(Boolean).join(' ') || '—'}
                  </td>
                  <td className="px-4 py-2 text-xs">{formatDate(row.warranty_expiry)}</td>
                  <td className="px-4 py-2 text-right">
                    <Badge tone={state === 'expired' ? 'red' : state === 'soon' ? 'amber' : 'green'}>
                      {days < 0 ? `${-days}d overdue` : `${days}d`}
                    </Badge>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </Card>
  )
}

function CapacityReport({ data }: { data: Reports }) {
  return (
    <Card>
      <CardHeader
        title={
          <span className="flex items-center gap-2">
            <Gauge size={15} className="text-teal-500" />
            Capacity report
          </span>
        }
        actions={
          <Button
            variant="secondary"
            size="sm"
            onClick={() =>
              downloadCsv(
                data.rack_capacity.map((r) => ({
                  rack: r.rack_name,
                  datacenter: r.datacenter,
                  room: r.room,
                  total_u: r.total_u,
                  used_u: r.used_u,
                  free_u: r.free_u,
                  utilization_percent: r.utilization_percent,
                  power_watts: r.power_consumption_watts,
                  power_capacity_watts: r.power_capacity_watts ?? '',
                  power_percent: r.power_percent,
                })),
                'report-capacity.csv',
              )
            }
          >
            <Download size={13} /> CSV
          </Button>
        }
      />
      <div className="grid grid-cols-2 gap-2 p-3 sm:max-w-md md:grid-cols-4">
        {data.datacenter_capacity.map((dc) => (
          <SummaryTile
            key={dc.datacenter}
            label={`${dc.datacenter} util.`}
            value={`${dc.utilization_percent}%`}
          />
        ))}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-surface-200 text-xs uppercase tracking-wide text-surface-500 dark:border-surface-800">
              <th className="px-4 py-2 font-medium">Rack</th>
              <th className="px-4 py-2 font-medium">Location</th>
              <th className="px-4 py-2 text-right font-medium">Total U</th>
              <th className="px-4 py-2 text-right font-medium">Used U</th>
              <th className="px-4 py-2 text-right font-medium">Free U</th>
              <th className="w-1/5 px-4 py-2 font-medium">Utilization</th>
              <th className="px-4 py-2 text-right font-medium">Power</th>
            </tr>
          </thead>
          <tbody>
            {data.rack_capacity.map((row) => (
              <tr key={row.rack_id} className="border-b border-surface-100 last:border-0 dark:border-surface-800/60">
                <td className="px-4 py-2">
                  <Link
                    to={`/racks/${row.rack_id}`}
                    className="font-medium hover:text-accent-600 dark:hover:text-accent-400"
                  >
                    {row.rack_name}
                  </Link>
                </td>
                <td className="px-4 py-2 text-xs text-surface-500">
                  {row.datacenter} / {row.room}
                </td>
                <td className="px-4 py-2 text-right tabular-nums">{row.total_u}</td>
                <td className="px-4 py-2 text-right tabular-nums">{row.used_u}</td>
                <td className="px-4 py-2 text-right tabular-nums">{row.free_u}</td>
                <td className="px-4 py-2">
                  <div className="flex items-center gap-2">
                    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-100 dark:bg-surface-800">
                      <div
                        className={cn(
                          'h-full rounded-full',
                          row.utilization_percent >= 90
                            ? 'bg-red-500'
                            : row.utilization_percent >= 70
                              ? 'bg-amber-500'
                              : 'bg-teal-500',
                        )}
                        style={{ width: `${Math.min(row.utilization_percent, 100)}%` }}
                      />
                    </div>
                    <span className="w-12 text-right text-xs tabular-nums text-surface-500">
                      {row.utilization_percent}%
                    </span>
                  </div>
                </td>
                <td className="px-4 py-2 text-right">
                  <span className={cn('text-xs tabular-nums', POWER_TEXT_CLASS[row.power_status])}>
                    {formatWatts(row.power_consumption_watts)} · {row.power_percent}%
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  )
}
