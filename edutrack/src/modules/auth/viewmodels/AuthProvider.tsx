import { useCallback, useEffect, useMemo, useState, type PropsWithChildren } from 'react'

import type { AuthUser } from '../models/AuthUser'
import { authApi } from '../services/authApi'
import { AuthContext, type AuthContextValue } from './authContext'

export function AuthProvider({ children }: PropsWithChildren) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  useEffect(() => {
    let active = true
    const restore = async () => {
      try {
        const result = await authApi.me()
        if (active) setUser(result.data.user)
      } catch {
        try {
          const result = await authApi.refresh()
          if (active) setUser(result.data.user)
        } catch {
          if (active) setUser(null)
        }
      } finally { if (active) setIsLoading(false) }
    }
    void restore()
    return () => { active = false }
  }, [])

  const logout = useCallback(async () => {
    try { await authApi.logout() } finally { setUser(null) }
  }, [])
  const value = useMemo<AuthContextValue>(() => ({ user, isLoading, setAuthenticatedUser: setUser, logout }), [isLoading, logout, user])
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
