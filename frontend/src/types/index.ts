export type UserRole = 'admin' | 'engineer' | 'viewer'

export const DEVICE_TYPES = [
  'server',
  'switch',
  'router',
  'firewall',
  'load_balancer',
  'san',
  'nas',
  'ups',
  'pdu',
] as const
export type DeviceType = (typeof DEVICE_TYPES)[number]

export const DEVICE_STATUSES = [
  'active',
  'inactive',
  'maintenance',
  'decommissioned',
] as const
export type DeviceStatus = (typeof DEVICE_STATUSES)[number]

export const LIFECYCLE_STAGES = [
  'planning',
  'ordered',
  'received',
  'installed',
  'production',
  'maintenance',
  'decommissioned',
  'disposed',
] as const
export type LifecycleStatus = (typeof LIFECYCLE_STAGES)[number]

export interface User {
  id: number
  email: string
  full_name: string
  role: UserRole
  organization_id: number
  is_active: boolean
  created_at: string
}

export interface TokenResponse {
  access_token: string
  refresh_token: string
  token_type: string
}

export interface DataCenter {
  id: number
  name: string
  location: string | null
  description: string | null
  organization_id: number
}

export interface Room {
  id: number
  name: string
  floor: string | null
  description: string | null
  datacenter_id: number
  organization_id: number
  floor_width: number
  floor_height: number
}

export interface Rack {
  id: number
  name: string
  u_height: number
  description: string | null
  room_id: number
  organization_id: number
  pos_x: number
  pos_y: number
  width_units: number
  depth_units: number
  power_capacity_watts: number | null
}

export interface FloorPlanRack {
  id: number
  name: string
  u_height: number
  pos_x: number
  pos_y: number
  width_units: number
  depth_units: number
  device_count: number
  used_u: number
  utilization_percent: number
  power_percent: number
  power_status: string
}

export interface FloorPlan {
  room_id: number
  room_name: string
  floor_width: number
  floor_height: number
  racks: FloorPlanRack[]
}

export interface RackUnit {
  u: number
  occupied: boolean
  device_id: number | null
  device_name: string | null
  device_type: DeviceType | null
  device_photo_url: string | null
}

export interface RackLayout {
  rack_id: number
  rack_name: string
  u_height: number
  units: RackUnit[]
  power_capacity_watts: number | null
  power_consumption_watts: number
  power_available_watts: number | null
  power_percent: number
  power_status: string
}

export interface Device {
  id: number
  name: string
  asset_tag: string
  serial_number: string
  vendor: string | null
  model: string | null
  device_type: DeviceType
  status: DeviceStatus
  lifecycle_status: LifecycleStatus
  owner: string | null
  department: string | null
  support_contract: string | null
  notes: string | null
  cpu: string | null
  ram: string | null
  storage: string | null
  ip_address: string | null
  mac_address: string | null
  operating_system: string | null
  power_watts: number | null
  rack_id: number | null
  warehouse_id: number | null
  position_u: number | null
  height_u: number
  warranty_expiry: string | null
  purchase_date: string | null
  photo_front_url: string | null
  photo_back_url: string | null
  organization_id: number
  created_at: string
  updated_at: string
}

export interface DeviceList {
  items: Device[]
  total: number
  page: number
  page_size: number
}

export interface DeviceGroupCounts {
  servers: number
  network: number
  storage: number
  power: number
}

export interface WarrantyExpiringDevice {
  id: number
  name: string
  asset_tag: string
  vendor: string | null
  model: string | null
  device_type: DeviceType
  warranty_expiry: string
}

export interface AuditLog {
  id: number
  user_email: string
  action: string
  entity_type: string
  entity_id: number
  entity_name: string
  old_values: Record<string, unknown> | null
  new_values: Record<string, unknown> | null
  timestamp: string
}

export interface AuditLogList {
  items: AuditLog[]
  total: number
  page: number
  page_size: number
}

export interface LowStockAlert {
  id: number
  name: string
  sku: string
  quantity: number
  min_threshold: number
  warehouse_id: number
}

export interface Dashboard {
  total_devices: number
  devices_by_group: DeviceGroupCounts
  rack_utilization_percent: number
  total_power_watts: number
  total_power_capacity_watts: number
  warranty_expiring_soon: WarrantyExpiringDevice[]
  low_stock: LowStockAlert[]
  recent_audit_logs: AuditLog[]
}

export const STOCK_CATEGORIES = [
  'cable',
  'transceiver',
  'rail_kit',
  'screw_kit',
  'spare_psu',
  'spare_drive',
  'other',
] as const
export type StockCategory = (typeof STOCK_CATEGORIES)[number]

export const STOCK_UNITS = ['pcs', 'box', 'meter', 'roll'] as const
export type StockUnit = (typeof STOCK_UNITS)[number]

export const MOVEMENT_TYPES = ['received', 'issued', 'adjusted', 'returned'] as const
export type MovementType = (typeof MOVEMENT_TYPES)[number]

export interface Warehouse {
  id: number
  name: string
  location: string | null
  description: string | null
  organization_id: number
}

export interface StockItem {
  id: number
  name: string
  sku: string
  category: StockCategory
  quantity: number
  min_threshold: number
  unit: StockUnit
  warehouse_id: number
  vendor: string | null
  notes: string | null
  organization_id: number
}

export interface StockMovement {
  id: number
  stock_item_id: number
  movement_type: MovementType
  quantity: number
  resulting_quantity: number
  performed_by_email: string
  note: string | null
  linked_device_id: number | null
  organization_id: number
  timestamp: string
}

export interface WarehouseDetail {
  warehouse: Warehouse
  stock_items: StockItem[]
  devices: Device[]
}

export interface DeviceFilters {
  search?: string
  device_type?: DeviceType
  status?: DeviceStatus
  lifecycle_status?: LifecycleStatus
  datacenter_id?: number
  rack_id?: number
  page?: number
  page_size?: number
}
