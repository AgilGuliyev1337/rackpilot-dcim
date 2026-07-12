import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { Rows3, HardDrive } from 'lucide-react'
import { listRacks } from '../api/racks'
import { listRooms } from '../api/rooms'
import { listDataCenters } from '../api/datacenters'
import { listDevices } from '../api/devices'
import { useAsync } from '../hooks/useAsync'
import { useI18n } from '../context/I18nContext'
import { Card } from '../components/ui/Card'
import { Skeleton } from '../components/ui/Skeleton'
import { EmptyState } from '../components/ui/EmptyState'
import { deviceGroup, GROUP_STRIP_CLASSES } from '../lib/deviceGroups'
import { POWER_BAR_CLASS, formatWatts } from '../lib/utilization'
import { cn } from '../lib/cn'
import type { Device, Rack } from '../types'

interface RackCard {
  rack: Rack
  location: string
  devices: Device[]
  occupiedU: number
}

/** Simplified per-U color strip, top U first. */
function MiniElevation({ rack, devices }: { rack: Rack; devices: Device[] }) {
  const strip = useMemo(() => {
    const byU = new Map<number, string>()
    for (const d of devices) {
      if (d.position_u === null) continue
      const cls = GROUP_STRIP_CLASSES[deviceGroup(d.device_type)]
      for (let u = d.position_u; u < d.position_u + d.height_u; u++) byU.set(u, cls)
    }
    return Array.from({ length: rack.u_height }, (_, i) => {
      const u = rack.u_height - i
      return byU.get(u) ?? null
    })
  }, [rack, devices])

  return (
    <div
      className="flex h-24 w-4 flex-col overflow-hidden rounded-sm border border-surface-300 dark:border-surface-700"
      aria-hidden
    >
      {strip.map((cls, i) => (
        <div
          key={i}
          className={cn('w-full flex-1', cls ?? 'bg-surface-100 dark:bg-surface-800/60')}
        />
      ))}
    </div>
  )
}

export function RacksPage() {
  const { t } = useI18n()
  const { data, loading } = useAsync(async () => {
    const [racks, rooms, dcs, devices] = await Promise.all([
      listRacks(),
      listRooms(),
      listDataCenters(),
      listDevices({ page_size: 200 }),
    ])
    return { racks, rooms, dcs, devices: devices.items }
  })

  const cards: RackCard[] = useMemo(() => {
    if (!data) return []
    return data.racks.map((rack) => {
      const room = data.rooms.find((r) => r.id === rack.room_id)
      const dc = room ? data.dcs.find((d) => d.id === room.datacenter_id) : undefined
      const devices = data.devices.filter((d) => d.rack_id === rack.id)
      return {
        rack,
        location: `${dc?.name ?? '?'} / ${room?.name ?? '?'}`,
        devices,
        occupiedU: devices
          .filter((d) => d.position_u !== null)
          .reduce((sum, d) => sum + d.height_u, 0),
      }
    })
  }, [data])

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-lg font-semibold">{t('page.racks')}</h1>

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-36" />
          ))}
        </div>
      ) : cards.length === 0 ? (
        <Card>
          <EmptyState
            icon={Rows3}
            title="No racks yet"
            description={
              <>
                Create racks inside a room on the{' '}
                <Link
                  to="/datacenters"
                  className="text-accent-600 hover:underline dark:text-accent-400"
                >
                  Data Centers
                </Link>{' '}
                page.
              </>
            }
          />
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {cards.map(({ rack, location, devices, occupiedU }) => {
            const pct = Math.round((occupiedU / rack.u_height) * 100)
            const power = devices.reduce((s, d) => s + (d.power_watts ?? 0), 0)
            const cap = rack.power_capacity_watts ?? 0
            const powerPct = cap ? Math.round((power / cap) * 100) : 0
            const powerState =
              powerPct >= 90 ? 'critical' : powerPct >= 70 ? 'warning' : 'normal'
            return (
              <Link key={rack.id} to={`/racks/${rack.id}`}>
                <Card className="flex h-full gap-3 p-4 transition-colors hover:border-accent-400 dark:hover:border-accent-600">
                  <MiniElevation rack={rack} devices={devices} />
                  <div className="flex min-w-0 flex-1 flex-col">
                    <h2 className="truncate text-sm font-semibold">{rack.name}</h2>
                    <p className="truncate text-xs text-surface-500">{location}</p>
                    <p className="mt-1 flex items-center gap-1 text-xs text-surface-500">
                      <HardDrive size={11} /> {devices.length} device
                      {devices.length === 1 ? '' : 's'} · {rack.u_height}U
                    </p>
                    <div className="mt-auto flex flex-col gap-2 pt-3">
                      <div>
                        <div className="mb-1 flex justify-between text-[11px] text-surface-500">
                          <span>{occupiedU}U used</span>
                          <span className="tabular-nums">{pct}%</span>
                        </div>
                        <div className="h-1.5 overflow-hidden rounded-full bg-surface-200 dark:bg-surface-800">
                          <div
                            className="h-full rounded-full bg-accent-600"
                            style={{ width: `${Math.min(pct, 100)}%` }}
                          />
                        </div>
                      </div>
                      <div>
                        <div className="mb-1 flex justify-between text-[11px] text-surface-500">
                          <span>{formatWatts(power)} power</span>
                          <span className="tabular-nums">{powerPct}%</span>
                        </div>
                        <div className="h-1.5 overflow-hidden rounded-full bg-surface-200 dark:bg-surface-800">
                          <div
                            className={cn('h-full rounded-full', POWER_BAR_CLASS[powerState])}
                            style={{ width: `${Math.min(powerPct, 100)}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </Card>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
