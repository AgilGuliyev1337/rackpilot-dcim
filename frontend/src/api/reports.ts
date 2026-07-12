import { api } from './client'

export interface InventoryRow {
  device_type: string
  vendor: string
  count: number
}

export interface WarrantyRow {
  id: number
  name: string
  asset_tag: string
  vendor: string | null
  model: string | null
  device_type: string
  warranty_expiry: string
}

export interface RackCapacityRow {
  rack_id: number
  rack_name: string
  datacenter: string
  room: string
  total_u: number
  used_u: number
  free_u: number
  utilization_percent: number
  power_capacity_watts: number | null
  power_consumption_watts: number
  power_percent: number
  power_status: string
}

export interface DatacenterCapacityRow {
  datacenter: string
  total_u: number
  used_u: number
  free_u: number
  utilization_percent: number
  power_capacity_watts: number
  power_consumption_watts: number
  power_percent: number
}

export interface LifecycleCount {
  lifecycle_status: string
  count: number
}

export interface StockLevelRow {
  id: number
  name: string
  sku: string
  category: string
  warehouse: string
  quantity: number
  min_threshold: number
  unit: string
  low: boolean
}

export interface Reports {
  inventory: InventoryRow[]
  warranty: WarrantyRow[]
  rack_capacity: RackCapacityRow[]
  datacenter_capacity: DatacenterCapacityRow[]
  lifecycle: LifecycleCount[]
  stock_levels: StockLevelRow[]
}

export async function getReports(): Promise<Reports> {
  const { data } = await api.get<Reports>('/reports')
  return data
}
