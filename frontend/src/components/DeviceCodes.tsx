import { useEffect, useState } from 'react'
import { Download, QrCode, Barcode as BarcodeIcon, Loader2 } from 'lucide-react'
import { deviceBarcodeUrl, deviceQrUrl, fetchCodeBlob } from '../api/devices'
import { apiErrorMessage } from '../api/client'
import { useToast } from '../context/ToastContext'
import { downloadBlob } from '../lib/download'
import { Button } from './ui/Button'
import { cn } from '../lib/cn'

type CodeKind = 'qr' | 'barcode'

interface DeviceCodesProps {
  deviceId: number
  assetTag: string
}

/** QR + Code128 barcode viewer with per-kind PNG download.
 *  Images are fetched as blobs (the endpoints require auth) and shown via object URLs. */
export function DeviceCodes({ deviceId, assetTag }: DeviceCodesProps) {
  const toast = useToast()
  const [kind, setKind] = useState<CodeKind>('qr')
  const [urls, setUrls] = useState<Record<CodeKind, string | null>>({ qr: null, barcode: null })
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    let revoked: string[] = []
    setLoading(true)
    Promise.all([
      fetchCodeBlob(deviceQrUrl(deviceId)),
      fetchCodeBlob(deviceBarcodeUrl(deviceId)),
    ])
      .then(([qr, bc]) => {
        const qrUrl = URL.createObjectURL(qr)
        const bcUrl = URL.createObjectURL(bc)
        revoked = [qrUrl, bcUrl]
        setUrls({ qr: qrUrl, barcode: bcUrl })
      })
      .catch((err) => toast.error(apiErrorMessage(err)))
      .finally(() => setLoading(false))
    return () => revoked.forEach((u) => URL.revokeObjectURL(u))
  }, [deviceId, toast])

  const download = async () => {
    try {
      const url = kind === 'qr' ? deviceQrUrl(deviceId) : deviceBarcodeUrl(deviceId)
      const blob = await fetchCodeBlob(url)
      downloadBlob(blob, `${assetTag}-${kind}.png`)
    } catch (err) {
      toast.error(apiErrorMessage(err))
    }
  }

  const current = urls[kind]

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="inline-flex rounded-md border border-surface-200 p-0.5 text-xs dark:border-surface-700">
        {(
          [
            ['qr', 'QR', QrCode],
            ['barcode', 'Barcode', BarcodeIcon],
          ] as const
        ).map(([k, label, Icon]) => (
          <button
            key={k}
            type="button"
            onClick={() => setKind(k)}
            className={cn(
              'flex items-center gap-1 rounded px-3 py-1 font-medium transition-colors',
              kind === k
                ? 'bg-accent-600 text-white'
                : 'text-surface-500 hover:text-surface-900 dark:hover:text-surface-100',
            )}
          >
            <Icon size={13} /> {label}
          </button>
        ))}
      </div>

      <div className="flex h-40 w-full items-center justify-center rounded-lg border border-surface-200 bg-white p-3 dark:border-surface-700">
        {loading || !current ? (
          <Loader2 size={20} className="animate-spin text-surface-400" />
        ) : (
          <img src={current} alt={`${kind} code`} className="max-h-full max-w-full" />
        )}
      </div>

      <Button variant="secondary" size="sm" onClick={download} disabled={loading}>
        <Download size={13} /> Download PNG
      </Button>
    </div>
  )
}
