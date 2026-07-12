import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Download, HardDrive, Plus, QrCode, Search, Upload } from 'lucide-react'
import { exportDevices, listDevices } from '../api/devices'
import { listDataCenters } from '../api/datacenters'
import { listRacks } from '../api/racks'
import { listRooms } from '../api/rooms'
import { useAsync } from '../hooks/useAsync'
import { useAuth } from '../context/AuthContext'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Select } from '../components/ui/Select'
import { Table, type Column } from '../components/ui/Table'
import { StatusBadge, Badge } from '../components/ui/Badge'
import { TableSkeleton } from '../components/ui/Skeleton'
import { EmptyState } from '../components/ui/EmptyState'
import { DeviceFormModal } from '../components/DeviceFormModal'
import { DeviceThumb } from '../components/DeviceThumb'
import { ImportModal } from '../components/ImportModal'
import { useToast } from '../context/ToastContext'
import { apiErrorMessage } from '../api/client'
import { downloadBlob } from '../lib/download'
import { deviceTypeLabel } from '../lib/format'
import { useI18n } from '../context/I18nContext'
import {
  DEVICE_STATUSES,
  DEVICE_TYPES,
  LIFECYCLE_STAGES,
  type Device,
  type DeviceStatus,
  type DeviceType,
  type LifecycleStatus,
} from '../types'

const PAGE_SIZE = 25

export function AssetsPage() {
  const navigate = useNavigate()
  const { canEdit } = useAuth()
  const { t } = useI18n()

  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [lifecycleFilter, setLifecycleFilter] = useState('')
  const [dcFilter, setDcFilter] = useState('')
  const [page, setPage] = useState(1)
  const [createOpen, setCreateOpen] = useState(false)
  const [importOpen, setImportOpen] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const toast = useToast()

  const doExport = async (format: 'csv' | 'xlsx') => {
    setExporting(true)
    try {
      const blob = await exportDevices(format, {
        device_type: (typeFilter || undefined) as DeviceType | undefined,
        status: (statusFilter || undefined) as DeviceStatus | undefined,
        datacenter_id: dcFilter ? Number(dcFilter) : undefined,
      })
      downloadBlob(blob, `devices.${format}`)
    } catch (err) {
      toast.error(apiErrorMessage(err))
    } finally {
      setExporting(false)
    }
  }

  // debounce search input
  useEffect(() => {
    const handle = window.setTimeout(() => {
      setDebouncedSearch(search)
      setPage(1)
    }, 300)
    return () => window.clearTimeout(handle)
  }, [search])

  const { data: meta } = useAsync(async () => {
    const [dcs, rooms, racks] = await Promise.all([
      listDataCenters(),
      listRooms(),
      listRacks(),
    ])
    return { dcs, rooms, racks }
  })

  const { data, loading, reload } = useAsync(
    () =>
      listDevices({
        search: debouncedSearch || undefined,
        device_type: (typeFilter || undefined) as DeviceType | undefined,
        status: (statusFilter || undefined) as DeviceStatus | undefined,
        lifecycle_status: (lifecycleFilter || undefined) as LifecycleStatus | undefined,
        datacenter_id: dcFilter ? Number(dcFilter) : undefined,
        page,
        page_size: PAGE_SIZE,
      }),
    [debouncedSearch, typeFilter, statusFilter, lifecycleFilter, dcFilter, page],
  )

  const locationOf = (device: Device): string => {
    if (!device.rack_id || !meta) return '—'
    const rack = meta.racks.find((r) => r.id === device.rack_id)
    if (!rack) return '—'
    const room = meta.rooms.find((r) => r.id === rack.room_id)
    const dc = room ? meta.dcs.find((d) => d.id === room.datacenter_id) : undefined
    const pos = device.position_u ? ` · U${device.position_u}` : ''
    return `${dc?.name ?? '?'} / ${rack.name}${pos}`
  }

  const toggleSelect = (id: number) =>
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  const columns: Column<Device>[] = [
    {
      key: 'select',
      header: '',
      className: 'w-8',
      render: (d) => (
        <input
          type="checkbox"
          checked={selected.has(d.id)}
          onClick={(e) => e.stopPropagation()}
          onChange={() => toggleSelect(d.id)}
          aria-label={`Select ${d.name}`}
        />
      ),
    },
    {
      key: 'name',
      header: t('common.name'),
      sortable: true,
      render: (d) => (
        <span className="flex items-center gap-2">
          <DeviceThumb photoUrl={d.photo_front_url} deviceType={d.device_type} size={28} />
          <span className="font-medium">{d.name}</span>
        </span>
      ),
    },
    { key: 'asset_tag', header: t('common.assetTag'), sortable: true },
    {
      key: 'device_type',
      header: t('common.type'),
      sortable: true,
      render: (d) => <Badge tone="neutral">{deviceTypeLabel(d.device_type)}</Badge>,
    },
    {
      key: 'vendor',
      header: t('common.vendorModel'),
      sortable: true,
      render: (d) => (
        <span>
          {d.vendor ?? '—'}
          {d.model && <span className="text-surface-500"> {d.model}</span>}
        </span>
      ),
    },
    {
      key: 'status',
      header: t('common.status'),
      sortable: true,
      render: (d) => <StatusBadge status={d.status} />,
    },
    {
      key: 'location',
      header: t('common.location'),
      render: (d) => <span className="text-xs">{locationOf(d)}</span>,
    },
    {
      key: 'ip_address',
      header: 'IP',
      sortable: true,
      render: (d) => <span className="font-mono text-xs">{d.ip_address ?? '—'}</span>,
    },
    {
      key: 'codes',
      header: '',
      className: 'w-8',
      render: (d) => (
        <Link
          to={`/assets/${d.id}`}
          onClick={(e) => e.stopPropagation()}
          className="text-surface-400 hover:text-accent-600 dark:hover:text-accent-400"
          title="View QR / barcode"
        >
          <QrCode size={15} />
        </Link>
      ),
    },
  ]

  const total = data?.total ?? 0
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">{t('page.assets')}</h1>
        <div className="flex gap-2">
          {selected.size > 0 && (
            <Button
              variant="secondary"
              onClick={() =>
                navigate(`/labels?ids=${[...selected].join(',')}&mode=both`)
              }
            >
              <QrCode size={14} /> {t('common.printLabels')} ({selected.size})
            </Button>
          )}
          <Button variant="secondary" loading={exporting} onClick={() => doExport('csv')}>
            <Download size={14} /> CSV
          </Button>
          <Button variant="secondary" loading={exporting} onClick={() => doExport('xlsx')}>
            <Download size={14} /> Excel
          </Button>
          {canEdit && (
            <>
              <Button variant="secondary" onClick={() => setImportOpen(true)}>
                <Upload size={14} /> {t('common.import')}
              </Button>
              <Button onClick={() => setCreateOpen(true)}>
                <Plus size={15} /> {t('common.newDevice')}
              </Button>
            </>
          )}
        </div>
      </div>

      <Card className="p-3">
        <div className="grid gap-2 md:grid-cols-5">
          <div className="relative md:col-span-1">
            <Search
              size={14}
              className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-surface-400"
            />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t('assets.searchPlaceholder')}
              className="h-9 w-full rounded-md border border-surface-300 bg-white pl-8 pr-3 text-sm placeholder:text-surface-400 focus:outline-none focus:ring-2 focus:ring-accent-500/40 dark:border-surface-700 dark:bg-surface-900"
            />
          </div>
          <Select
            placeholder={t('common.allTypes')}
            options={DEVICE_TYPES.map((dt) => ({ value: dt, label: deviceTypeLabel(dt) }))}
            value={typeFilter}
            onChange={(e) => {
              setTypeFilter(e.target.value)
              setPage(1)
            }}
          />
          <Select
            placeholder={t('common.allStatuses')}
            options={DEVICE_STATUSES.map((s) => ({ value: s, label: s }))}
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value)
              setPage(1)
            }}
          />
          <Select
            placeholder={t('common.allLifecycle')}
            options={LIFECYCLE_STAGES.map((s) => ({ value: s, label: s }))}
            value={lifecycleFilter}
            onChange={(e) => {
              setLifecycleFilter(e.target.value)
              setPage(1)
            }}
          />
          <Select
            placeholder={t('common.allDatacenters')}
            options={(meta?.dcs ?? []).map((d) => ({ value: String(d.id), label: d.name }))}
            value={dcFilter}
            onChange={(e) => {
              setDcFilter(e.target.value)
              setPage(1)
            }}
          />
        </div>
      </Card>

      <Card>
        {loading && !data ? (
          <TableSkeleton rows={8} cols={7} />
        ) : !data || data.items.length === 0 ? (
          <EmptyState
            icon={HardDrive}
            title={t('assets.noDevices')}
            description={t('assets.noDevicesDesc')}
          />
        ) : (
          <>
            <Table
              columns={columns}
              rows={data.items}
              rowKey={(d) => d.id}
              onRowClick={(d) => navigate(`/assets/${d.id}`)}
            />
            <div className="flex items-center justify-between border-t border-surface-200 px-3 py-2 text-xs text-surface-500 dark:border-surface-800">
              <span>{t('assets.deviceCount', { n: total, page, pages: totalPages })}</span>
              <div className="flex gap-1">
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                >
                  {t('common.previous')}
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  {t('common.next')}
                </Button>
              </div>
            </div>
          </>
        )}
      </Card>

      <DeviceFormModal
        open={createOpen}
        device={null}
        onClose={() => setCreateOpen(false)}
        onSaved={reload}
      />
      <ImportModal
        open={importOpen}
        onClose={() => setImportOpen(false)}
        onImported={reload}
      />
    </div>
  )
}
