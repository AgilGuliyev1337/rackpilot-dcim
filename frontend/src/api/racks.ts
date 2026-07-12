import { api } from './client'
import type { Rack, RackLayout } from '../types'

export interface RackPayload {
  name: string
  u_height?: number
  description?: string | null
  room_id: number
  pos_x?: number
  pos_y?: number
  width_units?: number
  depth_units?: number
}

export async function listRacks(roomId?: number): Promise<Rack[]> {
  const { data } = await api.get<Rack[]>('/racks', {
    params: roomId ? { room_id: roomId } : undefined,
  })
  return data
}

export async function getRackLayout(id: number): Promise<RackLayout> {
  const { data } = await api.get<RackLayout>(`/racks/${id}/layout`)
  return data
}

export async function createRack(payload: RackPayload): Promise<Rack> {
  const { data } = await api.post<Rack>('/racks', payload)
  return data
}

export async function updateRack(
  id: number,
  payload: Partial<RackPayload>,
): Promise<Rack> {
  const { data } = await api.put<Rack>(`/racks/${id}`, payload)
  return data
}

export async function deleteRack(id: number): Promise<void> {
  await api.delete(`/racks/${id}`)
}
