import { useCallback, useEffect, useMemo, useState, type PropsWithChildren } from 'react'

import { clearCsrfToken } from '../../../shared/api/httpClient'
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
      } finally {
        if (active) setIsLoading(false)
      }
    }

    void restore()

    const handleSessionExpired = () => {
      setUser(null)
      clearCsrfToken()
    }

    window.addEventListener('edutrack:session-expired', handleSessionExpired)

    return () => {
      active = false
      window.removeEventListener('edutrack:session-expired', handleSessionExpired)
    }
  }, [])

  const logout = useCallback(async () => {
    try {
      await authApi.logout()
    } finally {
      clearCsrfToken()
      setUser(null)
    }
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({ user, isLoading, setAuthenticatedUser: setUser, logout }),
    [isLoading, logout, user],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
