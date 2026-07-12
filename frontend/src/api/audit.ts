import { api } from './client'
import type { AuditLogList } from '../types'

export interface AuditFilters {
  action?: string
  entity_type?: string
  user_email?: string
  date_from?: string
  date_to?: string
  page?: number
  page_size?: number
}

export async function listAuditLogs(filters: AuditFilters = {}): Promise<AuditLogList> {
  const { data } = await api.get<AuditLogList>('/audit-logs', { params: filters })
  return data
}
