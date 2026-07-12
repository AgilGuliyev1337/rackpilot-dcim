import { useMemo, useState, type DragEvent } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  ArrowLeft,
  Server,
  Network,
  Database,
  Zap,
  Plus,
  Pencil,
  X,
  MoveVertical,
  PackageMinus,
} from 'lucide-react'
import { getRackLayout, listRacks } from '../api/racks'
import { listRooms } from '../api/rooms'
import { listDataCenters } from '../api/datacenters'
import { getDevice, listDevices, updateDevice } from '../api/devices'
import { apiErrorMessage } from '../api/client'
import { useAsync } from '../hooks/useAsync'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { Button } from '../components/ui/Button'
import { Modal } from '../components/ui/Modal'
import { Select } from '../components/ui/Select'
import { StatusBadge, Badge } from '../components/ui/Badge'
import { Skeleton } from '../components/ui/Skeleton'
import { DeviceFormModal } from '../components/DeviceFormModal'
import { deviceGroup, GROUP_BLOCK_CLASSES } from '../lib/deviceGroups'
import { deviceTypeLabel, formatDate } from '../lib/format'
import { POWER_BAR_CLASS, POWER_TEXT_CLASS, formatWatts } from '../lib/utilization'
import { cn } from '../lib/cn'
import type { Device, DeviceType, RackLayout } from '../types'

const ROW_H = 28 // px per U

const GROUP_ICONS: Record<string, typeof Server> = {
  servers: Server,
  network: Network,
  storage: Database,
  power: Zap,
}

interface Block {
  device_id: number
  device_name: string
  device_type: DeviceType
  photo_url: string | null
  topU: number
  height: number
}

/** Merge per-U layout units into device blocks. */
function toBlocks(layout: RackLayout): Block[] {
  const blocks: Block[] = []
  const seen = new Set<number>()
  // units come ordered u_height -> 1
  for (const unit of layout.units) {
    if (!unit.occupied || unit.device_id === null || seen.has(unit.device_id)) continue
    seen.add(unit.device_id)
    const height = layout.units.filter((u) => u.device_id === unit.device_id).length
    blocks.push({
      device_id: unit.device_id,
      device_name: unit.device_name ?? '?',
      device_type: unit.device_type ?? 'server',
      photo_url: unit.device_photo_url,
      topU: unit.u,
      height,
    })
  }
  return blocks
}

export function RackViewPage() {
  const params = useParams()
  const rackId = Number(params.id)
  const { canEdit } = useAuth()
  const toast = useToast()

  const { data, loading, reload } = useAsync(async () => {
    const [layout, racks, rooms, dcs] = await Promise.all([
      getRackLayout(rackId),
      listRacks(),
      listRooms(),
      listDataCenters(),
    ])
    const rack = racks.find((r) => r.id === rackId)
    const room = rack ? rooms.find((r) => r.id === rack.room_id) : undefined
    const dc = room ? dcs.find((d) => d.id === room.datacenter_id) : undefined
    return { layout, rack, room, dc }
  }, [rackId])

  const [selected, setSelected] = useState<Device | null>(null)
  const [panelLoading, setPanelLoading] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [addAtU, setAddAtU] = useState<number | null>(null)
  const [moveOpen, setMoveOpen] = useState(false)
  const [dragging, setDragging] = useState<Block | null>(null)
  const [dragOverU, setDragOverU] = useState<number | null>(null)

  const blocks = useMemo(() => (data ? toBlocks(data.layout) : []), [data])
  const occupiedU = blocks.reduce((sum, b) => sum + b.height, 0)
  const utilization = data ? Math.round((occupiedU / data.layout.u_height) * 100) : 0

  /** U numbers occupied by anyone except the given device. */
  const occupiedSet = useMemo(() => {
    const set = new Map<number, number>() // u -> device_id
    if (!data) return set
    for (const unit of data.layout.units) {
      if (unit.occupied && unit.device_id !== null) set.set(unit.u, unit.device_id)
    }
    return set
  }, [data])

  const fits = (bottomU: number, height: number, excludeDeviceId?: number): boolean => {
    if (!data) return false
    if (bottomU < 1 || bottomU + height - 1 > data.layout.u_height) return false
    for (let u = bottomU; u < bottomU + height; u++) {
      const owner = occupiedSet.get(u)
      if (owner !== undefined && owner !== excludeDeviceId) return false
    }
    return true
  }

  const openDevice = async (deviceId: number) => {
    setPanelLoading(true)
    try {
      setSelected(await getDevice(deviceId))
    } catch (err) {
      toast.error(apiErrorMessage(err))
    } finally {
      setPanelLoading(false)
    }
  }

  const moveDevice = async (device: { device_id: number }, bottomU: number) => {
    try {
      await updateDevice(device.device_id, { rack_id: rackId, position_u: bottomU })
      toast.success(`Moved to U${bottomU}`)
      setSelected(null)
      reload()
    } catch (err) {
      toast.error(apiErrorMessage(err))
      reload() // snap back
    }
  }

  const removeFromRack = async (device: Device) => {
    try {
      await updateDevice(device.id, { rack_id: null, position_u: null })
      toast.success(`${device.name} removed from rack`)
      setSelected(null)
      reload()
    } catch (err) {
      toast.error(apiErrorMessage(err))
    }
  }

  // drag & drop
  const onDragStart = (block: Block) => (e: DragEvent) => {
    e.dataTransfer.setData('text/plain', String(block.device_id))
    e.dataTransfer.effectAllowed = 'move'
    setDragging(block)
  }
  const onSlotDragOver = (u: number) => (e: DragEvent) => {
    if (!dragging) return
    if (fits(u, dragging.height, dragging.device_id)) {
      e.preventDefault()
      e.dataTransfer.dropEffect = 'move'
      setDragOverU(u)
    }
  }
  const onSlotDrop = (u: number) => (e: DragEvent) => {
    e.preventDefault()
    if (dragging && fits(u, dragging.height, dragging.device_id)) {
      void moveDevice(dragging, u)
    }
    setDragging(null)
    setDragOverU(null)
  }
  const onDragEnd = () => {
    setDragging(null)
    setDragOverU(null)
  }

  if (loading || !data) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-8 w-72" />
        <Skeleton className="h-[600px] max-w-xl" />
      </div>
    )
  }

  const { layout } = data
  const freeForSelected = selected
    ? Array.from({ length: layout.u_height }, (_, i) => i + 1).filter((u) =>
        fits(u, selected.height_u, selected.id),
      )
    : []

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <Link
            to="/racks"
            className="mb-1 inline-flex items-center gap-1 text-xs text-surface-500 hover:text-surface-900 dark:hover:text-surface-100"
          >
            <ArrowLeft size={12} /> Racks
          </Link>
          <h1 className="text-lg font-semibold">{layout.rack_name}</h1>
          <p className="text-xs text-surface-500">
            {data.dc ? (
              <Link to={`/datacenters/${data.dc.id}`} className="hover:underline">
                {data.dc.name}
              </Link>
            ) : (
              '?'
            )}
            {' / '}
            {data.room?.name ?? '?'} · {layout.u_height}U
          </p>
        </div>
        <div className="flex flex-col gap-2">
          <div className="w-56">
            <div className="mb-1 flex justify-between text-xs text-surface-500">
              <span>U utilization</span>
              <span className="tabular-nums">
                {occupiedU}U / {layout.u_height}U · {utilization}%
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-surface-200 dark:bg-surface-800">
              <div
                className="h-full rounded-full bg-accent-600"
                style={{ width: `${Math.min(utilization, 100)}%` }}
              />
            </div>
          </div>
          <div className="w-56">
            <div className="mb-1 flex justify-between text-xs text-surface-500">
              <span>Power</span>
              <span className={cn('tabular-nums', POWER_TEXT_CLASS[layout.power_status])}>
                {formatWatts(layout.power_consumption_watts)} /{' '}
                {formatWatts(layout.power_capacity_watts)} · {layout.power_percent}%
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-surface-200 dark:bg-surface-800">
              <div
                className={cn('h-full rounded-full', POWER_BAR_CLASS[layout.power_status])}
                style={{ width: `${Math.min(layout.power_percent, 100)}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-4 lg:flex-row">
        {/* Elevation */}
        <div className="w-full max-w-xl rounded-lg border border-surface-300 bg-surface-50 p-3 dark:border-surface-700 dark:bg-surface-900">
          <div
            className="relative grid"
            style={{
              gridTemplateColumns: '2.5rem 1fr',
              gridTemplateRows: `repeat(${layout.u_height}, ${ROW_H}px)`,
            }}
          >
            {/* U labels + empty slots */}
            {layout.units.map((unit) => {
              const rowIndex = layout.u_height - unit.u + 1
              const isValidTarget =
                dragging !== null && fits(unit.u, dragging.height, dragging.device_id)
              return (
                <div key={unit.u} className="contents">
                  <div
                    style={{ gridRow: rowIndex, gridColumn: 1 }}
                    className="flex items-center justify-end pr-2 font-mono text-[10px] text-surface-400"
                  >
                    {unit.u}
                  </div>
                  <div
                    style={{ gridRow: rowIndex, gridColumn: 2 }}
                    onDragOver={onSlotDragOver(unit.u)}
                    onDrop={onSlotDrop(unit.u)}
                    onClick={
                      !unit.occupied && canEdit && !dragging
                        ? () => setAddAtU(unit.u)
                        : undefined
                    }
                    className={cn(
                      'group m-px flex items-center justify-center rounded-sm border border-dashed text-[10px]',
                      dragging
                        ? isValidTarget
                          ? dragOverU === unit.u
                            ? 'border-accent-500 bg-accent-500/20'
                            : 'border-accent-400/60 bg-accent-500/5'
                          : 'border-surface-200 opacity-30 dark:border-surface-800'
                        : 'border-surface-200 text-transparent dark:border-surface-800',
                      !unit.occupied &&
                        canEdit &&
                        !dragging &&
                        'cursor-pointer hover:border-accent-400 hover:text-accent-500',
                    )}
                  >
                    {!unit.occupied && !dragging && (
                      <span className="hidden items-center gap-1 group-hover:flex">
                        <Plus size={10} /> U{unit.u}
                      </span>
                    )}
                  </div>
                </div>
              )
            })}

            {/* Device blocks */}
            {blocks.map((block) => {
              const group = deviceGroup(block.device_type)
              const Icon = GROUP_ICONS[group]
              const rowStart = layout.u_height - block.topU + 1
              return (
                <div
                  key={block.device_id}
                  draggable={canEdit}
                  onDragStart={onDragStart(block)}
                  onDragEnd={onDragEnd}
                  onClick={() => openDevice(block.device_id)}
                  style={{ gridRow: `${rowStart} / span ${block.height}`, gridColumn: 2 }}
                  className={cn(
                    'z-10 m-px flex cursor-pointer items-center gap-2 rounded-sm border px-2 text-xs font-medium shadow-sm transition-opacity',
                    GROUP_BLOCK_CLASSES[group],
                    canEdit && 'active:cursor-grabbing',
                    dragging?.device_id === block.device_id && 'opacity-40',
                  )}
                  title={`${block.device_name} (${deviceTypeLabel(block.device_type)}, ${block.height}U)`}
                >
                  {block.photo_url ? (
                    <img
                      src={block.photo_url}
                      alt=""
                      className="h-5 w-5 shrink-0 rounded-sm object-cover ring-1 ring-white/40"
                    />
                  ) : (
                    <Icon size={12} className="shrink-0 opacity-80" />
                  )}
                  <span className="truncate">{block.device_name}</span>
                  <span className="ml-auto shrink-0 font-mono text-[10px] opacity-70">
                    {block.height}U
                  </span>
                </div>
              )
            })}
          </div>
        </div>

        {/* Detail slide-over (inline panel on desktop) */}
        {(selected || panelLoading) && (
          <aside className="w-full shrink-0 rounded-lg border border-surface-200 bg-white dark:border-surface-800 dark:bg-surface-900 lg:w-96">
            {panelLoading || !selected ? (
              <div className="p-4">
                <Skeleton className="h-40" />
              </div>
            ) : (
              <>
                <div className="flex items-start justify-between border-b border-surface-200 px-4 py-3 dark:border-surface-800">
                  <div className="min-w-0">
                    <h2 className="truncate text-sm font-semibold">{selected.name}</h2>
                    <div className="mt-1 flex flex-wrap gap-1.5">
                      <StatusBadge status={selected.status} />
                      <Badge tone="neutral">{deviceTypeLabel(selected.device_type)}</Badge>
                    </div>
                  </div>
                  <button
                    onClick={() => setSelected(null)}
                    className="rounded p-1 text-surface-400 hover:bg-surface-100 dark:hover:bg-surface-800"
                    aria-label="Close panel"
                  >
                    <X size={15} />
                  </button>
                </div>
                <dl className="divide-y divide-surface-100 text-sm dark:divide-surface-800/60">
                  {(
                    [
                      ['Asset tag', selected.asset_tag],
                      ['Serial', selected.serial_number],
                      ['Vendor / Model', [selected.vendor, selected.model].filter(Boolean).join(' ') || '—'],
                      ['Position', selected.position_u ? (selected.height_u > 1 ? `U${selected.position_u} – U${selected.position_u + selected.height_u - 1}` : `U${selected.position_u}`) : '—'],
                      ['IP', selected.ip_address ?? '—'],
                      ['MAC', selected.mac_address ?? '—'],
                      ['CPU', selected.cpu ?? '—'],
                      ['RAM', selected.ram ?? '—'],
                      ['Storage', selected.storage ?? '—'],
                      ['OS', selected.operating_system ?? '—'],
                      ['Owner', selected.owner ?? '—'],
                      ['Warranty', selected.warranty_expiry ? formatDate(selected.warranty_expiry) : '—'],
                    ] as const
                  ).map(([label, value]) => (
                    <div key={label} className="flex justify-between gap-3 px-4 py-2">
                      <dt className="shrink-0 text-xs text-surface-500">{label}</dt>
                      <dd className="truncate text-right text-xs">{value}</dd>
                    </div>
                  ))}
                </dl>
                <div className="flex flex-wrap gap-2 border-t border-surface-200 p-3 dark:border-surface-800">
                  <Link to={`/assets/${selected.id}`} className="text-xs text-accent-600 hover:underline dark:text-accent-400">
                    Full details →
                  </Link>
                  {canEdit && (
                    <div className="flex w-full gap-2 pt-1">
                      <Button variant="secondary" size="sm" onClick={() => setEditOpen(true)}>
                        <Pencil size={12} /> Edit
                      </Button>
                      <Button variant="secondary" size="sm" onClick={() => setMoveOpen(true)}>
                        <MoveVertical size={12} /> Move
                      </Button>
                      <Button variant="danger" size="sm" onClick={() => removeFromRack(selected)}>
                        <PackageMinus size={12} /> Unrack
                      </Button>
                    </div>
                  )}
                </div>
              </>
            )}
          </aside>
        )}
      </div>

      {/* Move (non-drag fallback) */}
      <Modal
        open={moveOpen && selected !== null}
        title={`Move ${selected?.name ?? ''}`}
        onClose={() => setMoveOpen(false)}
      >
        <MoveForm
          positions={freeForSelected}
          height={selected?.height_u ?? 1}
          onMove={async (u) => {
            if (selected) {
              await moveDevice({ device_id: selected.id }, u)
              setMoveOpen(false)
            }
          }}
        />
      </Modal>

      {/* Add device on empty slot */}
      {addAtU !== null && (
        <AddDeviceModal
          rackId={rackId}
          bottomU={addAtU}
          fits={fits}
          onClose={() => setAddAtU(null)}
          onDone={() => {
            setAddAtU(null)
            reload()
          }}
        />
      )}

      {selected && (
        <DeviceFormModal
          open={editOpen}
          device={selected}
          onClose={() => setEditOpen(false)}
          onSaved={() => {
            reload()
            void openDevice(selected.id)
          }}
        />
      )}
    </div>
  )
}

function MoveForm({
  positions,
  height,
  onMove,
}: {
  positions: number[]
  height: number
  onMove: (u: number) => Promise<void>
}) {
  const [value, setValue] = useState('')
  const [busy, setBusy] = useState(false)
  return (
    <div className="flex flex-col gap-3">
      <Select
        label={`New position (device is ${height}U)`}
        placeholder="— choose free position —"
        options={positions.map((p) => ({
          value: String(p),
          label: height > 1 ? `U${p} – U${p + height - 1}` : `U${p}`,
        }))}
        value={value}
        onChange={(e) => setValue(e.target.value)}
      />
      <Button
        disabled={!value}
        loading={busy}
        onClick={async () => {
          setBusy(true)
          try {
            await onMove(Number(value))
          } finally {
            setBusy(false)
          }
        }}
      >
        Move device
      </Button>
    </div>
  )
}

function AddDeviceModal({
  rackId,
  bottomU,
  fits,
  onClose,
  onDone,
}: {
  rackId: number
  bottomU: number
  fits: (u: number, h: number, exclude?: number) => boolean
  onClose: () => void
  onDone: () => void
}) {
  const toast = useToast()
  const [mode, setMode] = useState<'existing' | 'new'>('existing')
  const [search, setSearch] = useState('')
  const [deviceId, setDeviceId] = useState('')
  const [busy, setBusy] = useState(false)

  const { data } = useAsync(async () => {
    const all = await listDevices({ page_size: 200 })
    return all.items.filter((d) => d.rack_id === null)
  })

  const unracked = (data ?? []).filter(
    (d) =>
      !search ||
      d.name.toLowerCase().includes(search.toLowerCase()) ||
      d.asset_tag.toLowerCase().includes(search.toLowerCase()),
  )
  const chosen = unracked.find((d) => String(d.id) === deviceId)
  const chosenFits = chosen ? fits(bottomU, chosen.height_u) : true

  const place = async () => {
    if (!chosen) return
    setBusy(true)
    try {
      await updateDevice(chosen.id, { rack_id: rackId, position_u: bottomU })
      toast.success(`${chosen.name} placed at U${bottomU}`)
      onDone()
    } catch (err) {
      toast.error(apiErrorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <Modal
        open={mode === 'existing'}
        title={`Add device at U${bottomU}`}
        onClose={onClose}
        footer={
          <>
            <Button variant="secondary" onClick={() => setMode('new')}>
              <Plus size={13} /> Create new device
            </Button>
            <Button onClick={place} disabled={!chosen || !chosenFits} loading={busy}>
              Place device
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-3">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search unracked devices…"
            className="h-9 rounded-md border border-surface-300 bg-white px-3 text-sm placeholder:text-surface-400 focus:outline-none focus:ring-2 focus:ring-accent-500/40 dark:border-surface-700 dark:bg-surface-900"
          />
          <div className="max-h-56 overflow-y-auto rounded-md border border-surface-200 dark:border-surface-700">
            {unracked.length === 0 ? (
              <p className="px-3 py-4 text-xs text-surface-500">
                No unracked devices{search ? ' match your search' : ''}.
              </p>
            ) : (
              unracked.map((d) => (
                <label
                  key={d.id}
                  className={cn(
                    'flex cursor-pointer items-center justify-between gap-2 border-b border-surface-100 px-3 py-2 text-sm last:border-0 dark:border-surface-800',
                    deviceId === String(d.id) && 'bg-accent-500/10',
                  )}
                >
                  <span className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="unracked"
                      checked={deviceId === String(d.id)}
                      onChange={() => setDeviceId(String(d.id))}
                    />
                    <span>
                      <span className="font-medium">{d.name}</span>{' '}
                      <span className="text-xs text-surface-500">
                        {d.asset_tag} · {d.height_u}U
                      </span>
                    </span>
                  </span>
                  <Badge tone="neutral">{deviceTypeLabel(d.device_type)}</Badge>
                </label>
              ))
            )}
          </div>
          {chosen && !chosenFits && (
            <p className="text-xs text-red-600 dark:text-red-400">
              {chosen.name} is {chosen.height_u}U and does not fit at U{bottomU}.
            </p>
          )}
        </div>
      </Modal>

      {mode === 'new' && (
        <NewDeviceAt rackId={rackId} bottomU={bottomU} onClose={onClose} onDone={onDone} />
      )}
    </>
  )
}

function NewDeviceAt({
  rackId,
  bottomU,
  onClose,
  onDone,
}: {
  rackId: number
  bottomU: number
  onClose: () => void
  onDone: () => void
}) {
  return (
    <DeviceFormModal
      open
      device={null}
      initialPlacement={{ rack_id: rackId, position_u: bottomU }}
      onClose={onClose}
      onSaved={onDone}
    />
  )
}
