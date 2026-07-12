import type { DeviceType } from '../types'

export type DeviceGroup = 'servers' | 'network' | 'storage' | 'power'

const GROUP_OF: Record<DeviceType, DeviceGroup> = {
  server: 'servers',
  switch: 'network',
  router: 'network',
  firewall: 'network',
  load_balancer: 'network',
  san: 'storage',
  nas: 'storage',
  ups: 'power',
  pdu: 'power',
}

export function deviceGroup(type: DeviceType): DeviceGroup {
  return GROUP_OF[type]
}

/** Solid block colors for rack elevation, consistent with dashboard groups. */
export const GROUP_BLOCK_CLASSES: Record<DeviceGroup, string> = {
  servers:
    'bg-accent-600/90 border-accent-700 text-white dark:bg-accent-600/80 dark:border-accent-500',
  network:
    'bg-violet-600/90 border-violet-700 text-white dark:bg-violet-600/80 dark:border-violet-500',
  storage:
    'bg-teal-600/90 border-teal-700 text-white dark:bg-teal-600/80 dark:border-teal-500',
  power:
    'bg-amber-500/90 border-amber-600 text-white dark:bg-amber-500/80 dark:border-amber-400',
}

/** Small strip colors for mini-elevation thumbnails. */
export const GROUP_STRIP_CLASSES: Record<DeviceGroup, string> = {
  servers: 'bg-accent-500',
  network: 'bg-violet-500',
  storage: 'bg-teal-500',
  power: 'bg-amber-500',
}
