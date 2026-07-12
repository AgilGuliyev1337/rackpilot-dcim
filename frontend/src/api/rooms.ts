import { api } from './client'
import type { FloorPlan, Room } from '../types'

export interface RoomPayload {
  name: string
  floor?: string | null
  description?: string | null
  datacenter_id: number
}

export async function getFloorPlan(roomId: number): Promise<FloorPlan> {
  const { data } = await api.get<FloorPlan>(`/rooms/${roomId}/floorplan`)
  return data
}

export async function listRooms(datacenterId?: number): Promise<Room[]> {
  const { data } = await api.get<Room[]>('/rooms', {
    params: datacenterId ? { datacenter_id: datacenterId } : undefined,
  })
  return data
}

export async function createRoom(payload: RoomPayload): Promise<Room> {
  const { data } = await api.post<Room>('/rooms', payload)
  return data
}

export async function updateRoom(
  id: number,
  payload: Partial<RoomPayload>,
): Promise<Room> {
  const { data } = await api.put<Room>(`/rooms/${id}`, payload)
  return data
}

export async function deleteRoom(id: number): Promise<void> {
  await api.delete(`/rooms/${id}`)
}
