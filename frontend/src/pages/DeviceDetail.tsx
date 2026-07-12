import { useState, type ReactNode } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Pencil, Trash2 } from 'lucide-react'
import { deleteDevice, getDevice, updateDevice } from '../api/devices'
import { getRackLayout, listRacks } from '../api/racks'
import { listRooms } from '../api/rooms'
import { listDataCenters } from '../api/datacenters'
import { apiErrorMessage } from '../api/client'
import { useAsync } from '../hooks/useAsync'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { Card, CardHeader } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Select } from '../components/ui/Select'
import { StatusBadge, Badge } from '../components/ui/Badge'
import { Skeleton } from '../components/ui/Skeleton'
import { ConfirmDialog } from '../components/ui/ConfirmDialog'
import { DeviceFormModal } from '../components/DeviceFormModal'
import { DevicePhoto } from '../components/DevicePhoto'
import { LifecycleStepper } from '../components/LifecycleStepper'
import { DeviceCodes } from '../components/DeviceCodes'
import { deviceTypeLabel, formatDate } from '../lib/format'
import { formatWatts } from '../lib/utilization'
import { LIFECYCLE_STAGES, type LifecycleStatus } from '../types'

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5 px-4 py-2.5">
      <dt className="text-[11px] uppercase tracking-wide text-surface-400">{label}</dt>
      <dd className="text-sm">{children ?? '—'}</dd>
    </div>
  )
}

export function DeviceDetailPage() {
  const params = useParams()
  const deviceId = Number(params.id)
  const navigate = useNavigate()
  const { canEdit } = useAuth()
  const toast = useToast()

  const [editOpen, setEditOpen] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleteLoading, setDeleteLoading] = useState(false)

  const { data, loading, reload } = useAsync(async () => {
    const device = await getDevice(deviceId)
    const [racks, rooms, dcs] = await Promise.all([
      listRacks(),
      listRooms(),
      listDataCenters(),
    ])
    const rack = device.rack_id ? racks.find((r) => r.id === device.rack_id) : undefined
    const room = rack ? rooms.find((r) => r.id === rack.room_id) : undefined
    const dc = room ? dcs.find((d) => d.id === room.datacenter_id) : undefined
    const layout = device.rack_id ? await getRackLayout(device.rack_id).catch(() => null) : null
    return { device, rack, room, dc, layout }
  }, [deviceId])

  const onDelete = async () => {
    setDeleteLoading(true)
    try {
      await deleteDevice(deviceId)
      toast.success('Device deleted')
      navigate('/assets')
    } catch (err) {
      toast.error(apiErrorMessage(err))
      setDeleteLoading(false)
    }
  }

  const changeLifecycle = async (next: LifecycleStatus) => {
    try {
      await updateDevice(deviceId, { lifecycle_status: next })
      toast.success(`Lifecycle set to ${next}`)
      reload()
    } catch (err) {
      toast.error(apiErrorMessage(err))
    }
  }

  if (loading || !data) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-8 w-72" />
        <div className="grid gap-4 lg:grid-cols-3">
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
        </div>
      </div>
    )
  }

  const d = data.device

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <Link
            to="/assets"
            className="mb-1 inline-flex items-center gap-1 text-xs text-surface-500 hover:text-surface-900 dark:hover:text-surface-100"
          >
            <ArrowLeft size={12} /> Assets
          </Link>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="truncate text-lg font-semibold">{d.name}</h1>
            <StatusBadge status={d.status} />
            <Badge tone="neutral">{deviceTypeLabel(d.device_type)}</Badge>
          </div>
          <p className="mt-0.5 text-xs text-surface-500">
            {d.asset_tag} · SN {d.serial_number}
          </p>
        </div>
        {canEdit && (
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => setEditOpen(true)}>
              <Pencil size={14} /> Edit
            </Button>
            <Button variant="danger" onClick={() => setConfirmDelete(true)}>
              <Trash2 size={14} /> Delete
            </Button>
          </div>
        )}
      </div>

      <Card className="p-4">
        <div className="mb-3 flex items-center justify-between gap-3">
          <span className="text-sm font-semibold">Lifecycle</span>
          {canEdit && (
            <div className="w-44">
              <Select
                options={LIFECYCLE_STAGES.map((s) => ({ value: s, label: s }))}
                value={d.lifecycle_status}
                onChange={(e) => changeLifecycle(e.target.value as LifecycleStatus)}
              />
            </div>
          )}
        </div>
        <LifecycleStepper current={d.lifecycle_status} />
      </Card>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader title="General" />
          <div className="border-b border-surface-100 px-4 py-4 dark:border-surface-800/60">
            <DevicePhoto device={d} canEdit={canEdit} onChange={() => reload()} />
          </div>
          <dl className="divide-y divide-surface-100 dark:divide-surface-800/60">
            <Field label="Vendor">{d.vendor}</Field>
            <Field label="Model">{d.model}</Field>
            <Field label="Owner">{d.owner}</Field>
            <Field label="Department">{d.department}</Field>
            <Field label="Support contract">{d.support_contract}</Field>
            <Field label="Purchase date">
              {d.purchase_date ? formatDate(d.purchase_date) : '—'}
            </Field>
            <Field label="Warranty expiry">
              {d.warranty_expiry ? formatDate(d.warranty_expiry) : '—'}
            </Field>
            <Field label="Notes">{d.notes}</Field>
            <Field label="Created">{formatDate(d.created_at)}</Field>
            <Field label="Last updated">{formatDate(d.updated_at)}</Field>
          </dl>
        </Card>

        <Card>
          <CardHeader title="Location" />
          <dl className="divide-y divide-surface-100 dark:divide-surface-800/60">
            <Field label="Datacenter">
              {data.dc ? (
                <Link
                  to={`/datacenters/${data.dc.id}`}
                  className="text-accent-600 hover:underline dark:text-accent-400"
                >
                  {data.dc.name}
                </Link>
              ) : (
                '—'
              )}
            </Field>
            <Field label="Room">{data.room?.name}</Field>
            <Field label="Rack">{data.rack?.name}</Field>
            <Field label="Position">
              {d.position_u
                ? d.height_u > 1
                  ? `U${d.position_u} – U${d.position_u + d.height_u - 1}`
                  : `U${d.position_u}`
                : 'Not racked'}
            </Field>
            <Field label="Height">{`${d.height_u}U`}</Field>
          </dl>
        </Card>

        <Card>
          <CardHeader title="Technical" />
          <dl className="divide-y divide-surface-100 dark:divide-surface-800/60">
            <Field label="IP address">
              {d.ip_address && <span className="font-mono text-xs">{d.ip_address}</span>}
            </Field>
            <Field label="MAC address">
              {d.mac_address && <span className="font-mono text-xs">{d.mac_address}</span>}
            </Field>
            <Field label="CPU">{d.cpu}</Field>
            <Field label="RAM">{d.ram}</Field>
            <Field label="Storage">{d.storage}</Field>
            <Field label="Operating system">{d.operating_system}</Field>
            <Field label="Power draw">
              {d.power_watts != null ? formatWatts(d.power_watts) : '—'}
            </Field>
          </dl>
        </Card>

        <Card>
          <CardHeader title="Codes" />
          <div className="px-4 py-4">
            <DeviceCodes deviceId={d.id} assetTag={d.asset_tag} />
          </div>
        </Card>
      </div>

      <DeviceFormModal
        open={editOpen}
        device={d}
        onClose={() => setEditOpen(false)}
        onSaved={reload}
      />
      <ConfirmDialog
        open={confirmDelete}
        title="Delete device"
        message={`Delete "${d.name}" (${d.asset_tag})? This cannot be undone.`}
        loading={deleteLoading}
        onConfirm={onDelete}
        onCancel={() => setConfirmDelete(false)}
      />
    </div>
  )
}
