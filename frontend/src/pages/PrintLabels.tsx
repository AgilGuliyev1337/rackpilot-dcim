import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { ArrowLeft, Printer } from 'lucide-react'
import { deviceBarcodeUrl, deviceQrUrl, fetchCodeBlob, getDevice } from '../api/devices'
import { apiErrorMessage } from '../api/client'
import { useToast } from '../context/ToastContext'
import { Button } from '../components/ui/Button'
import { Skeleton } from '../components/ui/Skeleton'

interface Label {
  id: number
  name: string
  assetTag: string
  qr: string | null
  barcode: string | null
}

type Mode = 'qr' | 'barcode' | 'both'

export function PrintLabelsPage() {
  const [params] = useSearchParams()
  const toast = useToast()
  const ids = useMemo(
    () =>
      (params.get('ids') ?? '')
        .split(',')
        .map((s) => Number(s))
        .filter((n) => n > 0),
    [params],
  )
  const [mode, setMode] = useState<Mode>((params.get('mode') as Mode) || 'both')
  const [labels, setLabels] = useState<Label[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let created: string[] = []
    setLoading(true)
    Promise.all(
      ids.map(async (id) => {
        const [device, qr, bc] = await Promise.all([
          getDevice(id),
          fetchCodeBlob(deviceQrUrl(id)),
          fetchCodeBlob(deviceBarcodeUrl(id)),
        ])
        const qrUrl = URL.createObjectURL(qr)
        const bcUrl = URL.createObjectURL(bc)
        created.push(qrUrl, bcUrl)
        return {
          id,
          name: device.name,
          assetTag: device.asset_tag,
          qr: qrUrl,
          barcode: bcUrl,
        }
      }),
    )
      .then(setLabels)
      .catch((err) => toast.error(apiErrorMessage(err)))
      .finally(() => setLoading(false))
    return () => created.forEach((u) => URL.revokeObjectURL(u))
  }, [ids, toast])

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2 print:hidden">
        <div>
          <Link
            to="/assets"
            className="mb-1 inline-flex items-center gap-1 text-xs text-surface-500 hover:text-surface-900 dark:hover:text-surface-100"
          >
            <ArrowLeft size={12} /> Assets
          </Link>
          <h1 className="text-lg font-semibold">Print labels · {ids.length} devices</h1>
        </div>
        <div className="flex items-center gap-2">
          <div className="inline-flex rounded-md border border-surface-200 p-0.5 text-xs dark:border-surface-700">
            {(['qr', 'barcode', 'both'] as const).map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={
                  'rounded px-3 py-1 font-medium capitalize ' +
                  (mode === m
                    ? 'bg-accent-600 text-white'
                    : 'text-surface-500 hover:text-surface-900 dark:hover:text-surface-100')
                }
              >
                {m}
              </button>
            ))}
          </div>
          <Button onClick={() => window.print()} disabled={loading || labels.length === 0}>
            <Printer size={14} /> Print
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
          {ids.map((id) => (
            <Skeleton key={id} className="h-40" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 print:grid-cols-3">
          {labels.map((label) => (
            <div
              key={label.id}
              className="flex flex-col items-center gap-1 rounded border border-surface-300 bg-white p-2 text-center dark:border-surface-700 print:border-black"
            >
              {(mode === 'qr' || mode === 'both') && label.qr && (
                <img src={label.qr} alt="" className="h-20 w-20" />
              )}
              {(mode === 'barcode' || mode === 'both') && label.barcode && (
                <img src={label.barcode} alt="" className="h-10 w-full object-contain" />
              )}
              <p className="mt-1 truncate text-xs font-semibold text-surface-900">{label.name}</p>
              <p className="font-mono text-[10px] text-surface-600">{label.assetTag}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
