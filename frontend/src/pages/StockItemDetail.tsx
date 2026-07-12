import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, Download, Package } from 'lucide-react'
import { getStockItem, listMovements } from '../api/warehouses'
import { getWarehouse } from '../api/warehouses'
import { fetchCodeBlob } from '../api/devices'
import { apiErrorMessage } from '../api/client'
import { useAsync } from '../hooks/useAsync'
import { useToast } from '../context/ToastContext'
import { downloadBlob } from '../lib/download'
import { Card, CardHeader } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Badge } from '../components/ui/Badge'
import { Skeleton } from '../components/ui/Skeleton'
import { timeAgo } from '../lib/format'

const MOVE_TONE: Record<string, 'green' | 'red' | 'blue' | 'neutral'> = {
  received: 'green',
  returned: 'green',
  issued: 'red',
  adjusted: 'blue',
}

export function StockItemDetailPage() {
  const { stockItemId } = useParams()
  const sid = Number(stockItemId)
  const toast = useToast()
  const [qr, setQr] = useState<string | null>(null)
  const [barcode, setBarcode] = useState<string | null>(null)

  const { data, loading } = useAsync(async () => {
    const item = await getStockItem(sid)
    const [movements, wh] = await Promise.all([
      listMovements(sid, 1, 100),
      getWarehouse(item.warehouse_id).catch(() => null),
    ])
    return { item, movements, warehouse: wh?.warehouse ?? null }
  }, [sid])

  useEffect(() => {
    let urls: string[] = []
    Promise.all([
      fetchCodeBlob(`/api/stock-items/${sid}/qrcode`),
      fetchCodeBlob(`/api/stock-items/${sid}/barcode`),
    ])
      .then(([q, b]) => {
        const qu = URL.createObjectURL(q)
        const bu = URL.createObjectURL(b)
        urls = [qu, bu]
        setQr(qu)
        setBarcode(bu)
      })
      .catch(() => {})
    return () => urls.forEach((u) => URL.revokeObjectURL(u))
  }, [sid])

  const downloadCode = async (kind: 'qrcode' | 'barcode') => {
    try {
      const blob = await fetchCodeBlob(`/api/stock-items/${sid}/${kind}`)
      downloadBlob(blob, `${data?.item.sku ?? sid}-${kind}.png`)
    } catch (err) {
      toast.error(apiErrorMessage(err))
    }
  }

  if (loading || !data) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-64" />
      </div>
    )
  }

  const { item, movements, warehouse } = data
  const low = item.quantity <= item.min_threshold

  return (
    <div className="flex flex-col gap-4">
      <div>
        <Link
          to={warehouse ? `/warehouses/${warehouse.id}` : '/warehouses'}
          className="mb-1 inline-flex items-center gap-1 text-xs text-surface-500 hover:text-surface-900 dark:hover:text-surface-100"
        >
          <ArrowLeft size={12} /> {warehouse?.name ?? 'Warehouses'}
        </Link>
        <div className="flex flex-wrap items-center gap-2">
          <Package size={18} className="text-surface-400" />
          <h1 className="text-lg font-semibold">{item.name}</h1>
          {low ? <Badge tone="red">low stock</Badge> : <Badge tone="green">in stock</Badge>}
        </div>
        <p className="mt-0.5 text-xs text-surface-500">SKU {item.sku} · {item.category.replace('_', ' ')}</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="p-4">
          <p className="text-xs text-surface-500">Current quantity</p>
          <p className="text-3xl font-semibold tabular-nums">
            {item.quantity} <span className="text-base text-surface-500">{item.unit}</span>
          </p>
          <p className="mt-2 text-xs text-surface-500">Low-stock threshold: {item.min_threshold} {item.unit}</p>
          {item.vendor && <p className="mt-1 text-xs text-surface-500">Vendor: {item.vendor}</p>}
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader title="Codes" />
          <div className="flex flex-wrap items-center gap-6 p-4">
            <div className="flex flex-col items-center gap-2">
              {qr ? <img src={qr} alt="QR" className="h-28 w-28" /> : <Skeleton className="h-28 w-28" />}
              <Button variant="secondary" size="sm" onClick={() => downloadCode('qrcode')}>
                <Download size={13} /> QR PNG
              </Button>
            </div>
            <div className="flex flex-col items-center gap-2">
              {barcode ? <img src={barcode} alt="barcode" className="h-20" /> : <Skeleton className="h-20 w-40" />}
              <Button variant="secondary" size="sm" onClick={() => downloadCode('barcode')}>
                <Download size={13} /> Barcode PNG
              </Button>
            </div>
          </div>
        </Card>
      </div>

      <Card>
        <CardHeader title={`Movement history (${movements.total})`} />
        {movements.items.length === 0 ? (
          <p className="px-4 py-4 text-xs text-surface-500">No movements recorded yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-surface-200 text-xs uppercase tracking-wide text-surface-500 dark:border-surface-800">
                  <th className="px-4 py-2 font-medium">When</th>
                  <th className="px-4 py-2 font-medium">Type</th>
                  <th className="px-4 py-2 text-right font-medium">Qty</th>
                  <th className="px-4 py-2 text-right font-medium">Resulting</th>
                  <th className="px-4 py-2 font-medium">By</th>
                  <th className="px-4 py-2 font-medium">Note</th>
                </tr>
              </thead>
              <tbody>
                {movements.items.map((m) => (
                  <tr key={m.id} className="border-b border-surface-100 last:border-0 dark:border-surface-800/60">
                    <td className="px-4 py-2 text-xs text-surface-500" title={new Date(m.timestamp).toLocaleString()}>
                      {timeAgo(m.timestamp)}
                    </td>
                    <td className="px-4 py-2"><Badge tone={MOVE_TONE[m.movement_type] ?? 'neutral'}>{m.movement_type}</Badge></td>
                    <td className="px-4 py-2 text-right tabular-nums">{m.quantity}</td>
                    <td className="px-4 py-2 text-right tabular-nums">{m.resulting_quantity}</td>
                    <td className="px-4 py-2 text-xs">{m.performed_by_email}</td>
                    <td className="px-4 py-2 text-xs text-surface-500">{m.note ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  )
}
