import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { ImagePlus } from 'lucide-react'
import {
  createDevice,
  updateDevice,
  uploadDevicePhoto,
  type DevicePayload,
} from '../api/devices'
import { getRackLayout, listRacks } from '../api/racks'
import { listRooms } from '../api/rooms'
import { listDataCenters } from '../api/datacenters'
import { listWarehouses } from '../api/warehouses'
import { apiErrorMessage } from '../api/client'
import { useAsync } from '../hooks/useAsync'
import { useToast } from '../context/ToastContext'
import { Modal } from './ui/Modal'
import { Button } from './ui/Button'
import { Input } from './ui/Input'
import { Select } from './ui/Select'
import { DevicePhoto } from './DevicePhoto'
import { deviceTypeLabel } from '../lib/format'
import {
  DEVICE_STATUSES,
  DEVICE_TYPES,
  LIFECYCLE_STAGES,
  type Device,
  type RackLayout,
} from '../types'

const IP_RE = /^(\d{1,3}\.){3}\d{1,3}$/
const MAC_RE = /^([0-9A-Fa-f]{2}[:-]){5}[0-9A-Fa-f]{2}$/

interface DeviceFormModalProps {
  open: boolean
  device: Device | null
  onClose: () => void
  onSaved: () => void
  /** Prefill rack/position when creating (device === null) */
  initialPlacement?: { rack_id: number; position_u: number }
}

interface FormState {
  name: string
  asset_tag: string
  serial_number: string
  vendor: string
  model: string
  device_type: string
  status: string
  lifecycle_status: string
  owner: string
  department: string
  support_contract: string
  notes: string
  cpu: string
  ram: string
  storage: string
  ip_address: string
  mac_address: string
  operating_system: string
  power_watts: string
  rack_id: string
  warehouse_id: string
  position_u: string
  height_u: string
  warranty_expiry: string
  purchase_date: string
}

function toForm(device: Device | null): FormState {
  return {
    name: device?.name ?? '',
    asset_tag: device?.asset_tag ?? '',
    serial_number: device?.serial_number ?? '',
    vendor: device?.vendor ?? '',
    model: device?.model ?? '',
    device_type: device?.device_type ?? 'server',
    status: device?.status ?? 'active',
    lifecycle_status: device?.lifecycle_status ?? 'production',
    owner: device?.owner ?? '',
    department: device?.department ?? '',
    support_contract: device?.support_contract ?? '',
    notes: device?.notes ?? '',
    cpu: device?.cpu ?? '',
    ram: device?.ram ?? '',
    storage: device?.storage ?? '',
    ip_address: device?.ip_address ?? '',
    mac_address: device?.mac_address ?? '',
    operating_system: device?.operating_system ?? '',
    power_watts: device?.power_watts != null ? String(device.power_watts) : '',
    rack_id: device?.rack_id ? String(device.rack_id) : '',
    warehouse_id: device?.warehouse_id ? String(device.warehouse_id) : '',
    position_u: device?.position_u ? String(device.position_u) : '',
    height_u: String(device?.height_u ?? 1),
    warranty_expiry: device?.warranty_expiry ?? '',
    purchase_date: device?.purchase_date ?? '',
  }
}

export function DeviceFormModal({
  open,
  device,
  onClose,
  onSaved,
  initialPlacement,
}: DeviceFormModalProps) {
  const toast = useToast()
  const [form, setForm] = useState<FormState>(toForm(device))
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({})
  const [saving, setSaving] = useState(false)
  const [layout, setLayout] = useState<RackLayout | null>(null)
  const [pendingFront, setPendingFront] = useState<File | null>(null)
  const [pendingBack, setPendingBack] = useState<File | null>(null)
  const [locationMode, setLocationMode] =
    useState<'rack' | 'warehouse' | 'unassigned'>('unassigned')
  const frontInputRef = useRef<HTMLInputElement>(null)
  const backInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (open) {
      const base = toForm(device)
      if (!device && initialPlacement) {
        base.rack_id = String(initialPlacement.rack_id)
        base.position_u = String(initialPlacement.position_u)
      }
      setForm(base)
      setErrors({})
      setPendingFront(null)
      setPendingBack(null)
      setLocationMode(
        base.warehouse_id ? 'warehouse' : base.rack_id ? 'rack' : 'unassigned',
      )
    }
  }, [open, device, initialPlacement])

  const { data: rackData } = useAsync(async () => {
    if (!open) return null
    const [racks, rooms, dcs, warehouses] = await Promise.all([
      listRacks(),
      listRooms(),
      listDataCenters(),
      listWarehouses(),
    ])
    return { racks, rooms, dcs, warehouses }
  }, [open])

  // load layout of selected rack to compute free positions
  useEffect(() => {
    const rackId = Number(form.rack_id)
    if (!rackId) {
      setLayout(null)
      return
    }
    let cancelled = false
    getRackLayout(rackId)
      .then((l) => {
        if (!cancelled) setLayout(l)
      })
      .catch(() => setLayout(null))
    return () => {
      cancelled = true
    }
  }, [form.rack_id])

  const rackOptions = useMemo(() => {
    if (!rackData) return []
    return rackData.racks.map((rack) => {
      const room = rackData.rooms.find((r) => r.id === rack.room_id)
      const dc = room ? rackData.dcs.find((d) => d.id === room.datacenter_id) : undefined
      return {
        value: String(rack.id),
        label: `${dc?.name ?? '?'} / ${room?.name ?? '?'} / ${rack.name}`,
      }
    })
  }, [rackData])

  const freePositions = useMemo(() => {
    if (!layout) return []
    const height = Math.max(1, Number(form.height_u) || 1)
    const occupied = new Set(
      layout.units
        .filter((u) => u.occupied && u.device_id !== device?.id)
        .map((u) => u.u),
    )
    const positions: number[] = []
    for (let start = 1; start + height - 1 <= layout.u_height; start++) {
      let fits = true
      for (let u = start; u < start + height; u++) {
        if (occupied.has(u)) {
          fits = false
          break
        }
      }
      if (fits) positions.push(start)
    }
    return positions
  }, [layout, form.height_u, device])

  const set =
    (key: keyof FormState) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm((f) => ({ ...f, [key]: e.target.value }))

  const validate = (): boolean => {
    const next: Partial<Record<keyof FormState, string>> = {}
    if (!form.name.trim()) next.name = 'Name is required'
    if (!form.asset_tag.trim()) next.asset_tag = 'Asset tag is required'
    if (!form.serial_number.trim()) next.serial_number = 'Serial number is required'
    if (form.ip_address && !IP_RE.test(form.ip_address))
      next.ip_address = 'Invalid IPv4 address (e.g. 10.0.1.5)'
    if (form.mac_address && !MAC_RE.test(form.mac_address))
      next.mac_address = 'Invalid MAC (e.g. 00:1B:44:11:3A:B7)'
    if (form.rack_id && !form.position_u)
      next.position_u = 'Choose a position, or clear the rack'
    setErrors(next)
    return Object.keys(next).length === 0
  }

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!validate()) return
    setSaving(true)
    try {
      const payload: DevicePayload = {
        name: form.name.trim(),
        asset_tag: form.asset_tag.trim(),
        serial_number: form.serial_number.trim(),
        vendor: form.vendor.trim() || null,
        model: form.model.trim() || null,
        device_type: form.device_type as DevicePayload['device_type'],
        status: form.status as DevicePayload['status'],
        lifecycle_status: form.lifecycle_status as DevicePayload['lifecycle_status'],
        owner: form.owner.trim() || null,
        department: form.department.trim() || null,
        support_contract: form.support_contract.trim() || null,
        notes: form.notes.trim() || null,
        cpu: form.cpu.trim() || null,
        ram: form.ram.trim() || null,
        storage: form.storage.trim() || null,
        ip_address: form.ip_address.trim() || null,
        mac_address: form.mac_address.trim() || null,
        operating_system: form.operating_system.trim() || null,
        power_watts: form.power_watts ? Number(form.power_watts) : null,
        rack_id: form.rack_id ? Number(form.rack_id) : null,
        warehouse_id: form.warehouse_id ? Number(form.warehouse_id) : null,
        position_u: form.rack_id && form.position_u ? Number(form.position_u) : null,
        height_u: Math.max(1, Number(form.height_u) || 1),
        warranty_expiry: form.warranty_expiry || null,
        purchase_date: form.purchase_date || null,
      }
      if (device) {
        await updateDevice(device.id, payload)
        toast.success('Device updated')
      } else {
        const created = await createDevice(payload)
        try {
          if (pendingFront) await uploadDevicePhoto(created.id, pendingFront, 'front')
          if (pendingBack) await uploadDevicePhoto(created.id, pendingBack, 'back')
        } catch (err) {
          toast.error(`Device created, but photo failed: ${apiErrorMessage(err)}`)
        }
        toast.success('Device created')
      }
      onSaved()
      onClose()
    } catch (err) {
      toast.error(apiErrorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      open={open}
      wide
      title={device ? `Edit ${device.name}` : 'New device'}
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" form="device-form" loading={saving}>
            {device ? 'Save changes' : 'Create device'}
          </Button>
        </>
      }
    >
      <form id="device-form" onSubmit={onSubmit} className="flex flex-col gap-4">
        {device ? (
          <div className="flex justify-center border-b border-surface-100 pb-4 dark:border-surface-800/60">
            <DevicePhoto device={device} canEdit onChange={() => onSaved()} />
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-4 border-b border-surface-100 pb-4 dark:border-surface-800/60">
            {(
              [
                ['front', pendingFront, setPendingFront, frontInputRef] as const,
                ['back', pendingBack, setPendingBack, backInputRef] as const,
              ]
            ).map(([label, pending, setPending, ref]) => (
              <div key={label} className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => ref.current?.click()}
                >
                  <ImagePlus size={13} />{' '}
                  {pending ? `Change ${label}` : `${label} photo`}
                </Button>
                {pending && (
                  <span className="max-w-[8rem] truncate text-xs text-surface-500">
                    {pending.name}
                  </span>
                )}
                <input
                  ref={ref}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={(e) => setPending(e.target.files?.[0] ?? null)}
                />
              </div>
            ))}
            <span className="text-xs text-surface-400">(optional)</span>
          </div>
        )}
        <fieldset className="grid gap-3 sm:grid-cols-2">
          <legend className="mb-2 text-xs font-semibold uppercase tracking-wide text-surface-500">
            General
          </legend>
          <Input label="Name *" value={form.name} onChange={set('name')} error={errors.name} />
          <Select
            label="Type *"
            options={DEVICE_TYPES.map((t) => ({ value: t, label: deviceTypeLabel(t) }))}
            value={form.device_type}
            onChange={set('device_type')}
          />
          <Input
            label="Asset tag *"
            placeholder="AZT-1234"
            value={form.asset_tag}
            onChange={set('asset_tag')}
            error={errors.asset_tag}
          />
          <Input
            label="Serial number *"
            value={form.serial_number}
            onChange={set('serial_number')}
            error={errors.serial_number}
          />
          <Input label="Vendor" value={form.vendor} onChange={set('vendor')} />
          <Input label="Model" value={form.model} onChange={set('model')} />
          <Select
            label="Status"
            options={DEVICE_STATUSES.map((s) => ({ value: s, label: s }))}
            value={form.status}
            onChange={set('status')}
          />
          <Select
            label="Lifecycle stage"
            options={LIFECYCLE_STAGES.map((s) => ({ value: s, label: s }))}
            value={form.lifecycle_status}
            onChange={set('lifecycle_status')}
          />
          <Input label="Owner" value={form.owner} onChange={set('owner')} />
          <Input label="Department" value={form.department} onChange={set('department')} />
          <Input
            label="Support contract"
            value={form.support_contract}
            onChange={set('support_contract')}
          />
          <Input
            label="Purchase date"
            type="date"
            value={form.purchase_date}
            onChange={set('purchase_date')}
          />
          <Input
            label="Warranty expiry"
            type="date"
            value={form.warranty_expiry}
            onChange={set('warranty_expiry')}
          />
          <Input label="Notes" value={form.notes} onChange={set('notes')} />
        </fieldset>

        <fieldset className="grid gap-3 sm:grid-cols-3">
          <legend className="mb-2 text-xs font-semibold uppercase tracking-wide text-surface-500">
            Location
          </legend>
          <div className="sm:col-span-3">
            <div className="inline-flex rounded-md border border-surface-200 p-0.5 text-xs dark:border-surface-700">
              {(['rack', 'warehouse', 'unassigned'] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => {
                    setLocationMode(m)
                    setForm((f) => ({
                      ...f,
                      rack_id: '',
                      position_u: '',
                      warehouse_id: '',
                    }))
                  }}
                  className={
                    'rounded px-3 py-1 font-medium capitalize ' +
                    (locationMode === m
                      ? 'bg-accent-600 text-white'
                      : 'text-surface-500 hover:text-surface-900 dark:hover:text-surface-100')
                  }
                >
                  {m}
                </button>
              ))}
            </div>
          </div>

          {locationMode === 'rack' && (
            <>
              <div className="sm:col-span-3">
                <Select
                  label="Rack"
                  placeholder="— not racked —"
                  options={rackOptions}
                  value={form.rack_id}
                  onChange={(e) => {
                    setForm((f) => ({
                      ...f,
                      rack_id: e.target.value,
                      position_u: '',
                      warehouse_id: '',
                    }))
                  }}
                />
              </div>
              <Input
                label="Height (U)"
                type="number"
                min={1}
                max={48}
                value={form.height_u}
                onChange={(e) =>
                  setForm((f) => ({ ...f, height_u: e.target.value, position_u: '' }))
                }
              />
              <div className="sm:col-span-2">
                <Select
                  label="Position (bottom U)"
                  placeholder={form.rack_id ? '— choose free position —' : '— select a rack first —'}
                  disabled={!form.rack_id}
                  options={freePositions.map((p) => {
                    const h = Math.max(1, Number(form.height_u) || 1)
                    return {
                      value: String(p),
                      label: h > 1 ? `U${p} – U${p + h - 1}` : `U${p}`,
                    }
                  })}
                  value={form.position_u}
                  onChange={set('position_u')}
                  error={errors.position_u}
                />
                {form.rack_id && layout && freePositions.length === 0 && (
                  <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">
                    No free {form.height_u}U slot in this rack.
                  </p>
                )}
              </div>
            </>
          )}

          {locationMode === 'warehouse' && (
            <div className="sm:col-span-3">
              <Select
                label="Warehouse"
                placeholder="— choose warehouse —"
                options={(rackData?.warehouses ?? []).map((w) => ({
                  value: String(w.id),
                  label: w.name,
                }))}
                value={form.warehouse_id}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    warehouse_id: e.target.value,
                    rack_id: '',
                    position_u: '',
                  }))
                }
              />
            </div>
          )}
        </fieldset>

        <fieldset className="grid gap-3 sm:grid-cols-2">
          <legend className="mb-2 text-xs font-semibold uppercase tracking-wide text-surface-500">
            Technical
          </legend>
          <Input
            label="IP address"
            placeholder="10.10.1.5"
            value={form.ip_address}
            onChange={set('ip_address')}
            error={errors.ip_address}
          />
          <Input
            label="MAC address"
            placeholder="00:1B:44:11:3A:B7"
            value={form.mac_address}
            onChange={set('mac_address')}
            error={errors.mac_address}
          />
          <Input label="CPU" value={form.cpu} onChange={set('cpu')} />
          <Input label="RAM" value={form.ram} onChange={set('ram')} />
          <Input label="Storage" value={form.storage} onChange={set('storage')} />
          <Input
            label="Operating system"
            value={form.operating_system}
            onChange={set('operating_system')}
          />
          <Input
            label="Power draw (watts)"
            type="number"
            min={0}
            placeholder="e.g. 450"
            value={form.power_watts}
            onChange={set('power_watts')}
          />
        </fieldset>
      </form>
    </Modal>
  )
}
