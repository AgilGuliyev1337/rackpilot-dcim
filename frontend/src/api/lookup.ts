import { api } from './client'

export interface LookupResult {
  type: 'device' | 'stock_item'
  id: number
  name: string
  identifier: string
}

export async function lookupCode(code: string): Promise<LookupResult> {
  const { data } = await api.get<LookupResult>(`/lookup/${encodeURIComponent(code)}`)
  return data
}
