import { useMemo, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { Building2, MapPin, Pencil, Plus, Trash2 } from 'lucide-react'
import {
  createDataCenter,
  deleteDataCenter,
  listDataCenters,
  updateDataCenter,
} from '../api/datacenters'
import { listRooms } from '../api/rooms'
import { listRacks } from '../api/racks'
import { listDevices } from '../api/devices'
import { apiErrorMessage } from '../api/client'
import { useAsync } from '../hooks/useAsync'
import { useI18n } from '../context/I18nContext'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Modal } from '../components/ui/Modal'
import { ConfirmDialog } from '../components/ui/ConfirmDialog'
import { Skeleton } from '../components/ui/Skeleton'
import { EmptyState } from '../components/ui/EmptyState'
import type { DataCenter } from '../types'

interface DcForm {
  name: string
  location: string
  description: string
}

const EMPTY_FORM: DcForm = { name: '', location: '', description: '' }

export function DataCentersPage() {
  const { canEdit } = useAuth()
  const { t } = useI18n()
  const toast = useToast()

  const { data, loading, reload } = useAsync(async () => {
    const [dcs, rooms, racks] = await Promise.all([
      listDataCenters(),
      listRooms(),
      listRacks(),
    ])
    const deviceCounts = await Promise.all(
      dcs.map((dc) => listDevices({ datacenter_id: dc.id, page_size: 1 })),
    )
    return { dcs, rooms, racks, deviceCounts: deviceCounts.map((d) => d.total) }
  })

  const counts = useMemo(() => {
    if (!data) return new Map<number, { rooms: number; racks: number; devices: number }>()
    const map = new Map<number, { rooms: number; racks: number; devices: number }>()
    data.dcs.forEach((dc, i) => {
      const roomIds = new Set(
        data.rooms.filter((r) => r.datacenter_id === dc.id).map((r) => r.id),
      )
      map.set(dc.id, {
        rooms: roomIds.size,
        racks: data.racks.filter((r) => roomIds.has(r.room_id)).length,
        devices: data.deviceCounts[i] ?? 0,
      })
    })
    return map
  }, [data])

  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<DataCenter | null>(null)
  const [form, setForm] = useState<DcForm>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState<DataCenter | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)

  const openCreate = () => {
    setEditing(null)
    setForm(EMPTY_FORM)
    setModalOpen(true)
  }
  const openEdit = (dc: DataCenter) => {
    setEditing(dc)
    setForm({
      name: dc.name,
      location: dc.location ?? '',
      description: dc.description ?? '',
    })
    setModalOpen(true)
  }

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      const payload = {
        name: form.name,
        location: form.location || null,
        description: form.description || null,
      }
      if (editing) {
        await updateDataCenter(editing.id, payload)
        toast.success('Datacenter updated')
      } else {
        await createDataCenter(payload)
        toast.success('Datacenter created')
      }
      setModalOpen(false)
      reload()
    } catch (err) {
      toast.error(apiErrorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  const onDelete = async () => {
    if (!deleting) return
    setDeleteLoading(true)
    try {
      await deleteDataCenter(deleting.id)
      toast.success(`Deleted "${deleting.name}"`)
      setDeleting(null)
      reload()
    } catch (err) {
      toast.error(apiErrorMessage(err))
    } finally {
      setDeleteLoading(false)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">{t('page.datacenters')}</h1>
        {canEdit && (
          <Button onClick={openCreate}>
            <Plus size={15} /> New datacenter
          </Button>
        )}
      </div>

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 2 }).map((_, i) => (
            <Skeleton key={i} className="h-40" />
          ))}
        </div>
      ) : !data || data.dcs.length === 0 ? (
        <Card>
          <EmptyState
            icon={Building2}
            title="No datacenters yet"
            description="Create your first datacenter to start organizing rooms, racks and devices."
            action={
              canEdit ? (
                <Button onClick={openCreate}>
                  <Plus size={15} /> New datacenter
                </Button>
              ) : undefined
            }
          />
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {data.dcs.map((dc) => {
            const c = counts.get(dc.id)
            return (
              <Card key={dc.id} className="flex flex-col p-4">
                <div className="flex items-start justify-between gap-2">
                  <Link to={`/datacenters/${dc.id}`} className="group min-w-0">
                    <h2 className="truncate text-base font-semibold group-hover:text-accent-600 dark:group-hover:text-accent-400">
                      {dc.name}
                    </h2>
                    {dc.location && (
                      <p className="mt-0.5 flex items-center gap-1 text-xs text-surface-500">
                        <MapPin size={12} /> {dc.location}
                      </p>
                    )}
                  </Link>
                  {canEdit && (
                    <div className="flex shrink-0 gap-1">
                      <Button variant="ghost" size="sm" onClick={() => openEdit(dc)} aria-label="Edit">
                        <Pencil size={14} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setDeleting(dc)}
                        aria-label="Delete"
                      >
                        <Trash2 size={14} className="text-red-500" />
                      </Button>
                    </div>
                  )}
                </div>
                {dc.description && (
                  <p className="mt-2 line-clamp-2 text-xs text-surface-500 dark:text-surface-400">
                    {dc.description}
                  </p>
                )}
                <div className="mt-auto grid grid-cols-3 gap-2 pt-4 text-center">
                  {(
                    [
                      ['Rooms', c?.rooms],
                      ['Racks', c?.racks],
                      ['Devices', c?.devices],
                    ] as const
                  ).map(([label, value]) => (
                    <div
                      key={label}
                      className="rounded-md bg-surface-50 py-2 dark:bg-surface-800/60"
                    >
                      <p className="text-sm font-semibold tabular-nums">{value ?? 0}</p>
                      <p className="text-[11px] text-surface-500">{label}</p>
                    </div>
                  ))}
                </div>
              </Card>
            )
          })}
        </div>
      )}

      <Modal
        open={modalOpen}
        title={editing ? 'Edit datacenter' : 'New datacenter'}
        onClose={() => setModalOpen(false)}
        footer={
          <>
            <Button variant="secondary" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" form="dc-form" loading={saving}>
              {editing ? 'Save changes' : 'Create'}
            </Button>
          </>
        }
      >
        <form id="dc-form" onSubmit={onSubmit} className="flex flex-col gap-3">
          <Input
            label="Name"
            required
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          />
          <Input
            label="Location"
            placeholder="City, Country"
            value={form.location}
            onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
          />
          <Input
            label="Description"
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
          />
        </form>
      </Modal>

      <ConfirmDialog
        open={deleting !== null}
        title="Delete datacenter"
        message={`Delete "${deleting?.name}"? All rooms and racks inside it will also be deleted. Devices will be unracked.`}
        loading={deleteLoading}
        onConfirm={onDelete}
        onCancel={() => setDeleting(null)}
      />
    </div>
  )
}
