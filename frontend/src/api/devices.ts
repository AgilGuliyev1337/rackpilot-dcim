import { api } from './client'
import type {
  Device,
  DeviceFilters,
  DeviceList,
  DeviceStatus,
  DeviceType,
  LifecycleStatus,
} from '../types'

export interface DevicePayload {
  name: string
  asset_tag: string
  serial_number: string
  vendor?: string | null
  model?: string | null
  device_type: DeviceType
  status?: DeviceStatus
  lifecycle_status?: LifecycleStatus
  owner?: string | null
  department?: string | null
  support_contract?: string | null
  notes?: string | null
  cpu?: string | null
  ram?: string | null
  storage?: string | null
  ip_address?: string | null
  mac_address?: string | null
  operating_system?: string | null
  power_watts?: number | null
  rack_id?: number | null
  warehouse_id?: number | null
  position_u?: number | null
  height_u?: number
  warranty_expiry?: string | null
  purchase_date?: string | null
}

export async function listDevices(filters: DeviceFilters = {}): Promise<DeviceList> {
  const { data } = await api.get<DeviceList>('/devices', { params: filters })
  return data
}

export async function getDevice(id: number): Promise<Device> {
  const { data } = await api.get<Device>(`/devices/${id}`)
  return data
}

export async function createDevice(payload: DevicePayload): Promise<Device> {
  const { data } = await api.post<Device>('/devices', payload)
  return data
}

export async function updateDevice(
  id: number,
  payload: Partial<DevicePayload>,
): Promise<Device> {
  const { data } = await api.put<Device>(`/devices/${id}`, payload)
  return data
}

export async function deleteDevice(id: number): Promise<void> {
  await api.delete(`/devices/${id}`)
}

export interface ImportRowError {
  row: number
  field: string
  message: string
}

export interface ImportResult {
  imported: number
  failed: number
  errors: ImportRowError[]
}

export async function exportDevices(
  format: 'csv' | 'xlsx',
  filters: Pick<DeviceFilters, 'device_type' | 'status' | 'datacenter_id'> = {},
): Promise<Blob> {
  const { data } = await api.get('/devices/export', {
    params: { format, ...filters },
    responseType: 'blob',
  })
  return data
}

export async function downloadImportTemplate(format: 'csv' | 'xlsx'): Promise<Blob> {
  const { data } = await api.get('/devices/import/template', {
    params: { format },
    responseType: 'blob',
  })
  return data
}

export async function importDevices(file: File): Promise<ImportResult> {
  const form = new FormData()
  form.append('file', file)
  const { data } = await api.post<ImportResult>('/devices/import', form)
  return data
}

export type PhotoSide = 'front' | 'back'

export async function uploadDevicePhoto(
  id: number,
  file: File,
  side: PhotoSide = 'front',
): Promise<Device> {
  const form = new FormData()
  form.append('file', file)
  const { data } = await api.post<Device>(`/devices/${id}/photo`, form, {
    params: { side },
  })
  return data
}

export async function deleteDevicePhoto(
  id: number,
  side: PhotoSide = 'front',
): Promise<Device> {
  const { data } = await api.delete<Device>(`/devices/${id}/photo`, {
    params: { side },
  })
  return data
}

/** Absolute-ish URL for embedding a device code image (served by the API). */
export function deviceQrUrl(id: number): string {
  return `/api/devices/${id}/qrcode`
}
export function deviceBarcodeUrl(id: number): string {
  return `/api/devices/${id}/barcode`
}

export async function fetchCodeBlob(url: string): Promise<Blob> {
  const { data } = await api.get(url.replace(/^\/api/, ''), { responseType: 'blob' })
  return data
}
