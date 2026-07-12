import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react'
import * as authApi from '../api/auth'
import { tokenStore } from '../api/client'
import type { User } from '../types'

interface AuthContextValue {
  user: User | null
  loading: boolean
  /** true for admin and engineer — controls visibility of mutating UI */
  canEdit: boolean
  isAdmin: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => void
  refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  const refreshUser = useCallback(async () => {
    if (!tokenStore.access) {
      setUser(null)
      return
    }
    try {
      setUser(await authApi.getMe())
    } catch {
      setUser(null)
    }
  }, [])

  useEffect(() => {
    refreshUser().finally(() => setLoading(false))
  }, [refreshUser])

  const login = useCallback(async (email: string, password: string) => {
    const tokens = await authApi.login(email, password)
    tokenStore.set(tokens)
    setUser(await authApi.getMe())
  }, [])

  const logout = useCallback(() => {
    // Best-effort server-side revocation (bumps token_version); clear locally regardless.
    authApi.logoutServer().catch(() => {})
    tokenStore.clear()
    setUser(null)
  }, [])

  const role = user?.role
  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        canEdit: role === 'admin' || role === 'engineer',
        isAdmin: role === 'admin',
        login,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
