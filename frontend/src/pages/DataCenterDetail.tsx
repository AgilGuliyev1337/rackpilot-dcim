import { useState, type FormEvent } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, DoorOpen, Map, Pencil, Plus, Rows3, Trash2 } from 'lucide-react'
import { getDataCenter } from '../api/datacenters'
import { createRoom, deleteRoom, listRooms, updateRoom } from '../api/rooms'
import { createRack, deleteRack, listRacks, updateRack } from '../api/racks'
import { apiErrorMessage } from '../api/client'
import { useAsync } from '../hooks/useAsync'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { Card, CardHeader } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Modal } from '../components/ui/Modal'
import { ConfirmDialog } from '../components/ui/ConfirmDialog'
import { Skeleton } from '../components/ui/Skeleton'
import { EmptyState } from '../components/ui/EmptyState'
import { Badge } from '../components/ui/Badge'
import type { Rack, Room } from '../types'

interface RoomForm {
  name: string
  floor: string
  description: string
}
interface RackForm {
  name: string
  u_height: string
  description: string
  room_id: number
}

export function DataCenterDetailPage() {
  const params = useParams()
  const dcId = Number(params.id)
  const { canEdit } = useAuth()
  const toast = useToast()

  const { data, loading, reload } = useAsync(async () => {
    const [dc, rooms, racks] = await Promise.all([
      getDataCenter(dcId),
      listRooms(dcId),
      listRacks(),
    ])
    return { dc, rooms, racks }
  }, [dcId])

  // room modal state
  const [roomModal, setRoomModal] = useState(false)
  const [editingRoom, setEditingRoom] = useState<Room | null>(null)
  const [roomForm, setRoomForm] = useState<RoomForm>({ name: '', floor: '', description: '' })
  // rack modal state
  const [rackModal, setRackModal] = useState(false)
  const [editingRack, setEditingRack] = useState<Rack | null>(null)
  const [rackForm, setRackForm] = useState<RackForm>({
    name: '',
    u_height: '42',
    description: '',
    room_id: 0,
  })
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState<
    { kind: 'room'; item: Room } | { kind: 'rack'; item: Rack } | null
  >(null)
  const [deleteLoading, setDeleteLoading] = useState(false)

  const openCreateRoom = () => {
    setEditingRoom(null)
    setRoomForm({ name: '', floor: '', description: '' })
    setRoomModal(true)
  }
  const openEditRoom = (room: Room) => {
    setEditingRoom(room)
    setRoomForm({
      name: room.name,
      floor: room.floor ?? '',
      description: room.description ?? '',
    })
    setRoomModal(true)
  }
  const openCreateRack = (roomId: number) => {
    setEditingRack(null)
    setRackForm({ name: '', u_height: '42', description: '', room_id: roomId })
    setRackModal(true)
  }
  const openEditRack = (rack: Rack) => {
    setEditingRack(rack)
    setRackForm({
      name: rack.name,
      u_height: String(rack.u_height),
      description: rack.description ?? '',
      room_id: rack.room_id,
    })
    setRackModal(true)
  }

  const submitRoom = async (e: FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      const payload = {
        name: roomForm.name,
        floor: roomForm.floor || null,
        description: roomForm.description || null,
        datacenter_id: dcId,
      }
      if (editingRoom) {
        await updateRoom(editingRoom.id, payload)
        toast.success('Room updated')
      } else {
        await createRoom(payload)
        toast.success('Room created')
      }
      setRoomModal(false)
      reload()
    } catch (err) {
      toast.error(apiErrorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  const submitRack = async (e: FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      const payload = {
        name: rackForm.name,
        u_height: Number(rackForm.u_height) || 42,
        description: rackForm.description || null,
        room_id: rackForm.room_id,
      }
      if (editingRack) {
        await updateRack(editingRack.id, payload)
        toast.success('Rack updated')
      } else {
        await createRack(payload)
        toast.success('Rack created')
      }
      setRackModal(false)
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
      if (deleting.kind === 'room') await deleteRoom(deleting.item.id)
      else await deleteRack(deleting.item.id)
      toast.success(`Deleted "${deleting.item.name}"`)
      setDeleting(null)
      reload()
    } catch (err) {
      toast.error(apiErrorMessage(err))
    } finally {
      setDeleteLoading(false)
    }
  }

  if (loading || !data) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-48" />
        <Skeleton className="h-48" />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <Link
            to="/datacenters"
            className="mb-1 inline-flex items-center gap-1 text-xs text-surface-500 hover:text-surface-900 dark:hover:text-surface-100"
          >
            <ArrowLeft size={12} /> Data Centers
          </Link>
          <h1 className="truncate text-lg font-semibold">{data.dc.name}</h1>
          {data.dc.location && (
            <p className="text-xs text-surface-500">{data.dc.location}</p>
          )}
        </div>
        {canEdit && (
          <Button onClick={openCreateRoom}>
            <Plus size={15} /> Add room
          </Button>
        )}
      </div>

      {data.rooms.length === 0 ? (
        <Card>
          <EmptyState
            icon={DoorOpen}
            title="No rooms in this datacenter"
            description="Add a room, then place racks inside it."
            action={
              canEdit ? (
                <Button onClick={openCreateRoom}>
                  <Plus size={15} /> Add room
                </Button>
              ) : undefined
            }
          />
        </Card>
      ) : (
        data.rooms.map((room) => {
          const racks = data.racks.filter((r) => r.room_id === room.id)
          return (
            <Card key={room.id}>
              <CardHeader
                title={
                  <span className="flex items-center gap-2">
                    <DoorOpen size={15} className="text-surface-400" />
                    {room.name}
                    {room.floor && <Badge tone="neutral">Floor {room.floor}</Badge>}
                    <Link
                      to={`/datacenters/${dcId}/rooms/${room.id}/floorplan`}
                      className="inline-flex items-center gap-1 text-xs font-normal text-accent-600 hover:underline dark:text-accent-400"
                    >
                      <Map size={12} /> Floor plan
                    </Link>
                  </span>
                }
                actions={
                  canEdit ? (
                    <div className="flex gap-1">
                      <Button variant="ghost" size="sm" onClick={() => openCreateRack(room.id)}>
                        <Plus size={13} /> Rack
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => openEditRoom(room)} aria-label="Edit room">
                        <Pencil size={13} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setDeleting({ kind: 'room', item: room })}
                        aria-label="Delete room"
                      >
                        <Trash2 size={13} className="text-red-500" />
                      </Button>
                    </div>
                  ) : undefined
                }
              />
              {racks.length === 0 ? (
                <p className="px-4 py-4 text-xs text-surface-500">No racks in this room.</p>
              ) : (
                <div className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-3">
                  {racks.map((rack) => (
                    <div
                      key={rack.id}
                      className="flex items-center justify-between gap-2 rounded-md border border-surface-200 px-3 py-2.5 dark:border-surface-700"
                    >
                      <div className="flex min-w-0 items-center gap-2">
                        <Rows3 size={15} className="shrink-0 text-surface-400" />
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">{rack.name}</p>
                          <p className="text-xs text-surface-500">
                            {rack.u_height}U ·{' '}
                            <Link
                              to={`/racks/${rack.id}`}
                              className="text-accent-600 hover:underline dark:text-accent-400"
                            >
                              Rack view
                            </Link>
                          </p>
                        </div>
                      </div>
                      {canEdit && (
                        <div className="flex shrink-0 gap-0.5">
                          <Button variant="ghost" size="sm" onClick={() => openEditRack(rack)} aria-label="Edit rack">
                            <Pencil size={13} />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setDeleting({ kind: 'rack', item: rack })}
                            aria-label="Delete rack"
                          >
                            <Trash2 size={13} className="text-red-500" />
                          </Button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </Card>
          )
        })
      )}

      <Modal
        open={roomModal}
        title={editingRoom ? 'Edit room' : 'New room'}
        onClose={() => setRoomModal(false)}
        footer={
          <>
            <Button variant="secondary" onClick={() => setRoomModal(false)}>
              Cancel
            </Button>
            <Button type="submit" form="room-form" loading={saving}>
              {editingRoom ? 'Save changes' : 'Create'}
            </Button>
          </>
        }
      >
        <form id="room-form" onSubmit={submitRoom} className="flex flex-col gap-3">
          <Input
            label="Name"
            required
            value={roomForm.name}
            onChange={(e) => setRoomForm((f) => ({ ...f, name: e.target.value }))}
          />
          <Input
            label="Floor"
            value={roomForm.floor}
            onChange={(e) => setRoomForm((f) => ({ ...f, floor: e.target.value }))}
          />
          <Input
            label="Description"
            value={roomForm.description}
            onChange={(e) => setRoomForm((f) => ({ ...f, description: e.target.value }))}
          />
        </form>
      </Modal>

      <Modal
        open={rackModal}
        title={editingRack ? 'Edit rack' : 'New rack'}
        onClose={() => setRackModal(false)}
        footer={
          <>
            <Button variant="secondary" onClick={() => setRackModal(false)}>
              Cancel
            </Button>
            <Button type="submit" form="rack-form" loading={saving}>
              {editingRack ? 'Save changes' : 'Create'}
            </Button>
          </>
        }
      >
        <form id="rack-form" onSubmit={submitRack} className="flex flex-col gap-3">
          <Input
            label="Name"
            required
            placeholder="RACK-01"
            value={rackForm.name}
            onChange={(e) => setRackForm((f) => ({ ...f, name: e.target.value }))}
          />
          <Input
            label="Height (U)"
            type="number"
            min={1}
            max={60}
            required
            value={rackForm.u_height}
            onChange={(e) => setRackForm((f) => ({ ...f, u_height: e.target.value }))}
          />
          <Input
            label="Description"
            value={rackForm.description}
            onChange={(e) => setRackForm((f) => ({ ...f, description: e.target.value }))}
          />
        </form>
      </Modal>

      <ConfirmDialog
        open={deleting !== null}
        title={deleting?.kind === 'room' ? 'Delete room' : 'Delete rack'}
        message={
          deleting?.kind === 'room'
            ? `Delete room "${deleting.item.name}" and all racks inside it?`
            : `Delete rack "${deleting?.item.name}"? Devices in it will be unracked.`
        }
        loading={deleteLoading}
        onConfirm={onDelete}
        onCancel={() => setDeleting(null)}
      />
    </div>
  )
}
