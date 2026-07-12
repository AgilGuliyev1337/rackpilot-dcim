import { Server, Network, Database, Zap } from 'lucide-react'
import { deviceGroup } from '../lib/deviceGroups'
import { cn } from '../lib/cn'
import type { DeviceType } from '../types'

const GROUP_ICON = {
  servers: Server,
  network: Network,
  storage: Database,
  power: Zap,
} as const

interface DeviceThumbProps {
  photoUrl: string | null
  deviceType: DeviceType
  size?: number
  className?: string
}

/** Small square: device photo if present, otherwise a neutral type icon. */
export function DeviceThumb({ photoUrl, deviceType, size = 32, className }: DeviceThumbProps) {
  const Icon = GROUP_ICON[deviceGroup(deviceType)]
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center justify-center overflow-hidden rounded border border-surface-200 bg-surface-100 text-surface-400 dark:border-surface-700 dark:bg-surface-800',
        className,
      )}
      style={{ width: size, height: size }}
    >
      {photoUrl ? (
        <img src={photoUrl} alt="" className="h-full w-full object-cover" />
      ) : (
        <Icon size={Math.round(size * 0.5)} />
      )}
    </span>
  )
}
