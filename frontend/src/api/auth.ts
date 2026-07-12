import { api } from './client'
import type { TokenResponse, User } from '../types'

export async function login(email: string, password: string): Promise<TokenResponse> {
  const { data } = await api.post<TokenResponse>('/auth/login', { email, password })
  return data
}

export async function register(payload: {
  organization_name: string
  email: string
  password: string
  full_name: string
}): Promise<User> {
  const { data } = await api.post<User>('/auth/register', payload)
  return data
}

export async function getMe(): Promise<User> {
  const { data } = await api.get<User>('/auth/me')
  return data
}

export async function logoutServer(): Promise<void> {
  await api.post('/auth/logout')
}
