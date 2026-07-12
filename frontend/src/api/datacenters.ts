import { api } from './client'
import type { DataCenter } from '../types'

export interface DataCenterPayload {
  name: string
  location?: string | null
  description?: string | null
}

export async function listDataCenters(): Promise<DataCenter[]> {
  const { data } = await api.get<DataCenter[]>('/datacenters')
  return data
}

export async function getDataCenter(id: number): Promise<DataCenter> {
  const { data } = await api.get<DataCenter>(`/datacenters/${id}`)
  return data
}

export async function createDataCenter(payload: DataCenterPayload): Promise<DataCenter> {
  const { data } = await api.post<DataCenter>('/datacenters', payload)
  return data
}

export async function updateDataCenter(
  id: number,
  payload: DataCenterPayload,
): Promise<DataCenter> {
  const { data } = await api.put<DataCenter>(`/datacenters/${id}`, payload)
  return data
}

export async function deleteDataCenter(id: number): Promise<void> {
  await api.delete(`/datacenters/${id}`)
}
