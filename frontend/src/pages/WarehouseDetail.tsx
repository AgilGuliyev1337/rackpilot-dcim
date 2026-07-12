import { useState, type FormEvent } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, ArrowDownToLine, ArrowUpFromLine, Package, Plus } from 'lucide-react'
import { createStockItem, getWarehouse, recordMovement } from '../api/warehouses'
import { apiErrorMessage } from '../api/client'
import { useAsync } from '../hooks/useAsync'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { Card, CardHeader } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Select } from '../components/ui/Select'
import { Modal } from '../components/ui/Modal'
import { Badge } from '../components/ui/Badge'
import { DeviceThumb } from '../components/DeviceThumb'
import { Skeleton } from '../components/ui/Skeleton'
import { EmptyState } from '../components/ui/EmptyState'
import { deviceTypeLabel } from '../lib/format'
import {
  MOVEMENT_TYPES,
  STOCK_CATEGORIES,
  STOCK_UNITS,
  type MovementType,
  type StockItem,
} from '../types'

export function WarehouseDetailPage() {
  const { id } = useParams()
  const wid = Number(id)
  const { canEdit } = useAuth()
  const toast = useToast()
  const { data, loading, reload } = useAsync(() => getWarehouse(wid), [wid])

  const [addOpen, setAddOpen] = useState(false)
  const [moveFor, setMoveFor] = useState<{ item: StockItem; type: MovementType } | null>(null)

  if (loading || !data) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-64" />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <Link to="/warehouses" className="mb-1 inline-flex items-center gap-1 text-xs text-surface-500 hover:text-surface-900 dark:hover:text-surface-100">
            <ArrowLeft size={12} /> Warehouses
          </Link>
          <h1 className="text-lg font-semibold">{data.warehouse.name}</h1>
          {data.warehouse.location && (
            <p className="text-xs text-surface-500">{data.warehouse.location}</p>
          )}
        </div>
        {canEdit && (
          <Button onClick={() => setAddOpen(true)}>
            <Plus size={15} /> Add stock item
          </Button>
        )}
      </div>

      <Card>
        <CardHeader title={`Stock items (${data.stock_items.length})`} />
        {data.stock_items.length === 0 ? (
          <EmptyState icon={Package} title="No stock items" description="Add a stock item to start tracking quantities." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-surface-200 text-xs uppercase tracking-wide text-surface-500 dark:border-surface-800">
                  <th className="px-4 py-2 font-medium">Name</th>
                  <th className="px-4 py-2 font-medium">SKU</th>
                  <th className="px-4 py-2 font-medium">Category</th>
                  <th className="px-4 py-2 text-right font-medium">Quantity</th>
                  <th className="px-4 py-2 font-medium">Status</th>
                  {canEdit && <th className="px-4 py-2 font-medium">Actions</th>}
                </tr>
              </thead>
              <tbody>
                {data.stock_items.map((item) => {
                  const low = item.quantity <= item.min_threshold
                  return (
                    <tr key={item.id} className="border-b border-surface-100 last:border-0 dark:border-surface-800/60">
                      <td className="px-4 py-2">
                        <Link to={`/warehouses/stock/${item.id}`} className="font-medium hover:text-accent-600 dark:hover:text-accent-400">
                          {item.name}
                        </Link>
                      </td>
                      <td className="px-4 py-2 font-mono text-xs">{item.sku}</td>
                      <td className="px-4 py-2 text-xs">{item.category.replace('_', ' ')}</td>
                      <td className="px-4 py-2 text-right tabular-nums">
                        {item.quantity} <span className="text-xs text-surface-500">{item.unit}</span>
                      </td>
                      <td className="px-4 py-2">
                        {low ? (
                          <Badge tone="red">low (≤{item.min_threshold})</Badge>
                        ) : (
                          <Badge tone="green">ok</Badge>
                        )}
                      </td>
                      {canEdit && (
                        <td className="px-4 py-2">
                          <div className="flex gap-1">
                            <Button variant="ghost" size="sm" onClick={() => setMoveFor({ item, type: 'received' })}>
                              <ArrowDownToLine size={13} /> Receive
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => setMoveFor({ item, type: 'issued' })}>
                              <ArrowUpFromLine size={13} /> Issue
                            </Button>
                          </div>
                        </td>
                      )}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Card>
        <CardHeader title={`Devices stored here (${data.devices.length})`} />
        {data.devices.length === 0 ? (
          <p className="px-4 py-4 text-xs text-surface-500">No devices are stored in this warehouse.</p>
        ) : (
          <ul className="divide-y divide-surface-100 dark:divide-surface-800/60">
            {data.devices.map((d) => (
              <li key={d.id} className="flex items-center gap-2 px-4 py-2">
                <DeviceThumb photoUrl={d.photo_front_url} deviceType={d.device_type} size={26} />
                <Link to={`/assets/${d.id}`} className="text-sm font-medium hover:text-accent-600 dark:hover:text-accent-400">
                  {d.name}
                </Link>
                <span className="text-xs text-surface-500">{d.asset_tag} · {deviceTypeLabel(d.device_type)}</span>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {addOpen && (
        <AddStockModal warehouseId={wid} onClose={() => setAddOpen(false)} onDone={() => { setAddOpen(false); reload() }} />
      )}
      {moveFor && (
        <MovementModal
          item={moveFor.item}
          initialType={moveFor.type}
          onClose={() => setMoveFor(null)}
          onDone={() => { setMoveFor(null); reload() }}
        />
      )}
    </div>
  )

  function AddStockModal({ warehouseId, onClose, onDone }: { warehouseId: number; onClose: () => void; onDone: () => void }) {
    const [form, setForm] = useState({
      name: '', sku: '', category: 'other', quantity: '0', min_threshold: '0',
      unit: 'pcs', vendor: '',
    })
    const [busy, setBusy] = useState(false)
    const submit = async (e: FormEvent) => {
      e.preventDefault()
      setBusy(true)
      try {
        await createStockItem({
          name: form.name, sku: form.sku,
          category: form.category as StockItem['category'],
          quantity: Number(form.quantity) || 0,
          min_threshold: Number(form.min_threshold) || 0,
          unit: form.unit as StockItem['unit'],
          warehouse_id: warehouseId,
          vendor: form.vendor || null,
        })
        toast.success('Stock item added')
        onDone()
      } catch (err) {
        toast.error(apiErrorMessage(err))
      } finally {
        setBusy(false)
      }
    }
    return (
      <Modal open title="Add stock item" onClose={onClose} wide
        footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button type="submit" form="stock-form" loading={busy}>Add</Button></>}>
        <form id="stock-form" onSubmit={submit} className="grid gap-3 sm:grid-cols-2">
          <Input label="Name *" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} required />
          <Input label="SKU *" value={form.sku} onChange={(e) => setForm((f) => ({ ...f, sku: e.target.value }))} required />
          <Select label="Category" options={STOCK_CATEGORIES.map((c) => ({ value: c, label: c.replace('_', ' ') }))} value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))} />
          <Select label="Unit" options={STOCK_UNITS.map((u) => ({ value: u, label: u }))} value={form.unit} onChange={(e) => setForm((f) => ({ ...f, unit: e.target.value }))} />
          <Input label="Initial quantity" type="number" min={0} value={form.quantity} onChange={(e) => setForm((f) => ({ ...f, quantity: e.target.value }))} />
          <Input label="Low-stock threshold" type="number" min={0} value={form.min_threshold} onChange={(e) => setForm((f) => ({ ...f, min_threshold: e.target.value }))} />
          <Input label="Vendor" value={form.vendor} onChange={(e) => setForm((f) => ({ ...f, vendor: e.target.value }))} />
        </form>
      </Modal>
    )
  }

  function MovementModal({ item, initialType, onClose, onDone }: { item: StockItem; initialType: MovementType; onClose: () => void; onDone: () => void }) {
    const [type, setType] = useState<MovementType>(initialType)
    const [quantity, setQuantity] = useState('1')
    const [note, setNote] = useState('')
    const [busy, setBusy] = useState(false)
    const submit = async (e: FormEvent) => {
      e.preventDefault()
      setBusy(true)
      try {
        const updated = await recordMovement(item.id, {
          movement_type: type,
          quantity: Number(quantity) || 0,
          note: note || null,
        })
        toast.success(`${item.name}: now ${updated.quantity} ${updated.unit}`)
        onDone()
      } catch (err) {
        toast.error(apiErrorMessage(err))
      } finally {
        setBusy(false)
      }
    }
    return (
      <Modal open title={`Stock movement · ${item.name}`} onClose={onClose}
        footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button type="submit" form="move-form" loading={busy}>Record</Button></>}>
        <form id="move-form" onSubmit={submit} className="flex flex-col gap-3">
          <p className="text-xs text-surface-500">Current quantity: <span className="font-semibold">{item.quantity} {item.unit}</span></p>
          <Select label="Movement type" options={MOVEMENT_TYPES.map((t) => ({ value: t, label: t }))} value={type} onChange={(e) => setType(e.target.value as MovementType)} />
          <Input
            label={type === 'adjusted' ? 'Set quantity to' : 'Quantity'}
            type="number"
            min={type === 'adjusted' ? 0 : 1}
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            required
          />
          <Input label="Note" value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. issued for Device X install" />
        </form>
      </Modal>
    )
  }
}
