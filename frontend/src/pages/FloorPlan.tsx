import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type MouseEvent,
  type PointerEvent,
} from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Box, Boxes, Plus } from 'lucide-react'
import { getFloorPlan } from '../api/rooms'
import { createRack, updateRack } from '../api/racks'
import { apiErrorMessage } from '../api/client'
import { useAsync } from '../hooks/useAsync'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Modal } from '../components/ui/Modal'
import { Skeleton } from '../components/ui/Skeleton'
import { utilizationBand, UTIL_FILL_CLASS, POWER_BAR_CLASS } from '../lib/utilization'
import { cn } from '../lib/cn'
import type { FloorPlanRack } from '../types'

const CELL = 34 // px per grid unit

interface DragState {
  id: number
  offsetX: number
  offsetY: number
  x: number
  y: number
}

export function FloorPlanPage() {
  const { dcId, roomId } = useParams()
  const rid = Number(roomId)
  const navigate = useNavigate()
  const { canEdit } = useAuth()
  const toast = useToast()

  const { data, loading, reload } = useAsync(() => getFloorPlan(rid), [rid])
  const [racks, setRacks] = useState<FloorPlanRack[]>([])
  const [drag, setDrag] = useState<DragState | null>(null)
  const [addAt, setAddAt] = useState<{ x: number; y: number } | null>(null)
  const boardRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (data) setRacks(data.racks)
  }, [data])

  const clamp = (v: number, max: number) => Math.max(0, Math.min(v, max))

  const onPointerDownRack = (rack: FloorPlanRack) => (e: PointerEvent) => {
    if (!canEdit) return
    e.stopPropagation()
    const board = boardRef.current!.getBoundingClientRect()
    setDrag({
      id: rack.id,
      offsetX: e.clientX - board.left - rack.pos_x * CELL,
      offsetY: e.clientY - board.top - rack.pos_y * CELL,
      x: rack.pos_x,
      y: rack.pos_y,
    })
  }

  const onPointerMove = (e: PointerEvent) => {
    if (!drag || !data) return
    const board = boardRef.current!.getBoundingClientRect()
    const rack = racks.find((r) => r.id === drag.id)!
    const rawX = (e.clientX - board.left - drag.offsetX) / CELL
    const rawY = (e.clientY - board.top - drag.offsetY) / CELL
    const x = clamp(Math.round(rawX), data.floor_width - rack.width_units)
    const y = clamp(Math.round(rawY), data.floor_height - rack.depth_units)
    setDrag({ ...drag, x, y })
    setRacks((prev) => prev.map((r) => (r.id === drag.id ? { ...r, pos_x: x, pos_y: y } : r)))
  }

  const onPointerUp = async () => {
    if (!drag) return
    const current = drag
    setDrag(null)
    try {
      await updateRack(current.id, { pos_x: current.x, pos_y: current.y })
    } catch (err) {
      toast.error(apiErrorMessage(err))
      reload() // snap back to server state
    }
  }

  const onBoardClick = (e: MouseEvent) => {
    if (!canEdit || drag || !data) return
    const board = boardRef.current!.getBoundingClientRect()
    const x = Math.floor((e.clientX - board.left) / CELL)
    const y = Math.floor((e.clientY - board.top) / CELL)
    if (x < 0 || y < 0 || x >= data.floor_width || y >= data.floor_height) return
    setAddAt({ x, y })
  }

  const gridLines = useMemo(() => {
    if (!data) return {}
    return {
      backgroundSize: `${CELL}px ${CELL}px`,
      backgroundImage:
        'linear-gradient(to right, rgba(120,120,140,0.15) 1px, transparent 1px),' +
        'linear-gradient(to bottom, rgba(120,120,140,0.15) 1px, transparent 1px)',
      width: data.floor_width * CELL,
      height: data.floor_height * CELL,
    }
  }, [data])

  if (loading || !data) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-[520px]" />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <Link
            to={dcId ? `/datacenters/${dcId}` : '/datacenters'}
            className="mb-1 inline-flex items-center gap-1 text-xs text-surface-500 hover:text-surface-900 dark:hover:text-surface-100"
          >
            <ArrowLeft size={12} /> Back
          </Link>
          <h1 className="text-lg font-semibold">{data.room_name} — Floor plan</h1>
          <p className="text-xs text-surface-500">
            {data.floor_width} × {data.floor_height} grid · {racks.length} racks
            {canEdit && ' · drag to reposition, click an empty cell to add a rack'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-3 text-xs text-surface-500">
            <span className="flex items-center gap-1">
              <span className="h-3 w-3 rounded-sm bg-emerald-500/80" /> &lt;70%
            </span>
            <span className="flex items-center gap-1">
              <span className="h-3 w-3 rounded-sm bg-amber-500/80" /> 70–90%
            </span>
            <span className="flex items-center gap-1">
              <span className="h-3 w-3 rounded-sm bg-red-500/80" /> ≥90%
            </span>
          </div>
          <Link
            to={`/datacenters/${dcId}/rooms/${rid}/3d`}
            className="inline-flex items-center gap-1 rounded-md border border-surface-300 px-2.5 py-1.5 text-xs font-medium hover:bg-surface-50 dark:border-surface-700 dark:hover:bg-surface-800"
          >
            <Boxes size={13} /> 3D view
          </Link>
        </div>
      </div>

      <Card className="overflow-auto p-4">
        <div
          ref={boardRef}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onClick={onBoardClick}
          className="relative rounded-md bg-surface-50 dark:bg-surface-950"
          style={gridLines}
        >
          {racks.map((rack) => {
            const band = utilizationBand(rack.utilization_percent)
            return (
              <div
                key={rack.id}
                onPointerDown={onPointerDownRack(rack)}
                onClick={(e) => {
                  e.stopPropagation()
                  if (!drag) navigate(`/racks/${rack.id}`)
                }}
                title={`${rack.name} — U ${rack.utilization_percent}% · power ${rack.power_percent}% (${rack.power_status}) · ${rack.device_count} devices`}
                className={cn(
                  'group absolute flex flex-col items-center justify-center rounded border text-center text-white shadow-sm transition-shadow',
                  UTIL_FILL_CLASS[band],
                  canEdit ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer',
                  drag?.id === rack.id && 'ring-2 ring-white',
                )}
                style={{
                  left: rack.pos_x * CELL,
                  top: rack.pos_y * CELL,
                  width: rack.width_units * CELL,
                  height: rack.depth_units * CELL,
                }}
              >
                <span
                  className={cn(
                    'absolute right-1 top-1 h-2 w-2 rounded-full ring-1 ring-white/70',
                    POWER_BAR_CLASS[rack.power_status],
                  )}
                  title={`Power ${rack.power_percent}% (${rack.power_status})`}
                />
                <Box size={14} className="opacity-80" />
                <span className="max-w-full truncate px-1 text-[10px] font-semibold leading-tight">
                  {rack.name}
                </span>
                <span className="text-[9px] opacity-90">{rack.utilization_percent}%</span>
              </div>
            )
          })}
        </div>
      </Card>

      {addAt && (
        <AddRackModal
          roomId={rid}
          at={addAt}
          floorWidth={data.floor_width}
          floorHeight={data.floor_height}
          onClose={() => setAddAt(null)}
          onCreated={() => {
            setAddAt(null)
            reload()
          }}
        />
      )}
    </div>
  )
}

function AddRackModal({
  roomId,
  at,
  floorWidth,
  floorHeight,
  onClose,
  onCreated,
}: {
  roomId: number
  at: { x: number; y: number }
  floorWidth: number
  floorHeight: number
  onClose: () => void
  onCreated: () => void
}) {
  const toast = useToast()
  const [name, setName] = useState('')
  const [uHeight, setUHeight] = useState('42')
  const [busy, setBusy] = useState(false)

  const submit = async () => {
    if (!name.trim()) return
    setBusy(true)
    try {
      await createRack({
        name: name.trim(),
        u_height: Number(uHeight) || 42,
        room_id: roomId,
        pos_x: Math.min(at.x, floorWidth - 2),
        pos_y: Math.min(at.y, floorHeight - 2),
        width_units: 2,
        depth_units: 2,
      })
      toast.success(`Rack "${name}" added`)
      onCreated()
    } catch (err) {
      toast.error(apiErrorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal
      open
      title={`Add rack at (${at.x}, ${at.y})`}
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={submit} loading={busy} disabled={!name.trim()}>
            <Plus size={14} /> Add rack
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-3">
        <Input label="Rack name" placeholder="RACK-09" value={name} onChange={(e) => setName(e.target.value)} />
        <Input
          label="Height (U)"
          type="number"
          min={1}
          max={60}
          value={uHeight}
          onChange={(e) => setUHeight(e.target.value)}
        />
      </div>
    </Modal>
  )
}
