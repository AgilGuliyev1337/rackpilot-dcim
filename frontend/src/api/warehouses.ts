import { api } from './client'
import type {
  MovementType,
  StockCategory,
  StockItem,
  StockMovement,
  StockUnit,
  Warehouse,
  WarehouseDetail,
} from '../types'

export interface WarehousePayload {
  name: string
  location?: string | null
  description?: string | null
}

export async function listWarehouses(): Promise<Warehouse[]> {
  const { data } = await api.get<Warehouse[]>('/warehouses')
  return data
}

export async function getWarehouse(id: number): Promise<WarehouseDetail> {
  const { data } = await api.get<WarehouseDetail>(`/warehouses/${id}`)
  return data
}

export async function createWarehouse(payload: WarehousePayload): Promise<Warehouse> {
  const { data } = await api.post<Warehouse>('/warehouses', payload)
  return data
}

export async function updateWarehouse(
  id: number,
  payload: WarehousePayload,
): Promise<Warehouse> {
  const { data } = await api.put<Warehouse>(`/warehouses/${id}`, payload)
  return data
}

export async function deleteWarehouse(id: number): Promise<void> {
  await api.delete(`/warehouses/${id}`)
}

export interface StockItemPayload {
  name: string
  sku: string
  category: StockCategory
  quantity?: number
  min_threshold: number
  unit: StockUnit
  warehouse_id: number
  vendor?: string | null
  notes?: string | null
}

export async function getStockItem(id: number): Promise<StockItem> {
  const { data } = await api.get<StockItem>(`/stock-items/${id}`)
  return data
}

export async function searchStockItems(search: string): Promise<StockItem[]> {
  const { data } = await api.get<StockItem[]>('/stock-items', { params: { search } })
  return data
}

export async function createStockItem(payload: StockItemPayload): Promise<StockItem> {
  const { data } = await api.post<StockItem>('/stock-items', payload)
  return data
}

export async function updateStockItem(
  id: number,
  payload: Partial<StockItemPayload>,
): Promise<StockItem> {
  const { data } = await api.put<StockItem>(`/stock-items/${id}`, payload)
  return data
}

export async function deleteStockItem(id: number): Promise<void> {
  await api.delete(`/stock-items/${id}`)
}

export interface MovementPayload {
  movement_type: MovementType
  quantity: number
  note?: string | null
  linked_device_id?: number | null
}

export async function recordMovement(
  itemId: number,
  payload: MovementPayload,
): Promise<StockItem> {
  const { data } = await api.post<StockItem>(`/stock-items/${itemId}/movement`, payload)
  return data
}

export interface MovementList {
  items: StockMovement[]
  total: number
  page: number
  page_size: number
}

export async function listMovements(
  itemId: number,
  page = 1,
  pageSize = 25,
): Promise<MovementList> {
  const { data } = await api.get<MovementList>(`/stock-items/${itemId}/movements`, {
    params: { page, page_size: pageSize },
  })
  return data
}
