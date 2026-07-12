import { useRef, useState } from 'react'
import { ImagePlus, Trash2, Loader2 } from 'lucide-react'
import { deleteDevicePhoto, uploadDevicePhoto, type PhotoSide } from '../api/devices'
import { apiErrorMessage } from '../api/client'
import { useToast } from '../context/ToastContext'
import { DeviceThumb } from './DeviceThumb'
import { Button } from './ui/Button'
import { cn } from '../lib/cn'
import type { Device } from '../types'

interface DevicePhotoProps {
  device: Device
  canEdit: boolean
  onChange: (device: Device) => void
}

/** Front/back device photos with per-side upload/replace/remove controls. */
export function DevicePhoto({ device, canEdit, onChange }: DevicePhotoProps) {
  const toast = useToast()
  const inputRef = useRef<HTMLInputElement>(null)
  const [side, setSide] = useState<PhotoSide>('front')
  const [busy, setBusy] = useState(false)

  const currentUrl = side === 'front' ? device.photo_front_url : device.photo_back_url

  const pick = async (file: File | undefined | null) => {
    if (!file) return
    if (!/\.(jpe?g|png|webp)$/i.test(file.name)) {
      toast.error('Only JPEG, PNG and WEBP images are supported')
      return
    }
    setBusy(true)
    try {
      onChange(await uploadDevicePhoto(device.id, file, side))
      toast.success(`${side === 'front' ? 'Front' : 'Back'} photo updated`)
    } catch (err) {
      toast.error(apiErrorMessage(err))
    } finally {
      setBusy(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  const remove = async () => {
    setBusy(true)
    try {
      onChange(await deleteDevicePhoto(device.id, side))
      toast.success(`${side === 'front' ? 'Front' : 'Back'} photo removed`)
    } catch (err) {
      toast.error(apiErrorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="inline-flex rounded-md border border-surface-200 p-0.5 text-xs dark:border-surface-700">
        {(['front', 'back'] as const).map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setSide(s)}
            className={cn(
              'rounded px-3 py-1 font-medium capitalize transition-colors',
              side === s
                ? 'bg-accent-600 text-white'
                : 'text-surface-500 hover:text-surface-900 dark:hover:text-surface-100',
            )}
          >
            {s}
            {(s === 'front' ? device.photo_front_url : device.photo_back_url) && (
              <span className="ml-1 inline-block h-1.5 w-1.5 rounded-full bg-emerald-400 align-middle" />
            )}
          </button>
        ))}
      </div>

      <div className="relative">
        <DeviceThumb
          photoUrl={currentUrl}
          deviceType={device.device_type}
          size={160}
          className="rounded-lg"
        />
        {busy && (
          <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-surface-950/40">
            <Loader2 className="animate-spin text-white" size={22} />
          </div>
        )}
      </div>

      {canEdit && (
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" disabled={busy} onClick={() => inputRef.current?.click()}>
            <ImagePlus size={13} /> {currentUrl ? 'Replace' : 'Upload'}
          </Button>
          {currentUrl && (
            <Button variant="ghost" size="sm" disabled={busy} onClick={remove}>
              <Trash2 size={13} className="text-red-500" /> Remove
            </Button>
          )}
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={(e) => pick(e.target.files?.[0])}
          />
        </div>
      )}
    </div>
  )
}
