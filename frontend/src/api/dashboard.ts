import { api } from './client'
import type { Dashboard } from '../types'

export async function getDashboard(): Promise<Dashboard> {
  const { data } = await api.get<Dashboard>('/dashboard')
  return data
}
