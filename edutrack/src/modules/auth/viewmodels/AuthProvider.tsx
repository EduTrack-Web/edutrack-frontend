import { useCallback, useEffect, useMemo, useState, type PropsWithChildren } from 'react'

import { clearCsrfToken } from '@/shared/api/httpClient'
import type { AuthUser } from '@/modules/auth/models/AuthUser'
import { authApi } from '@/modules/auth/services/authApi'
import { AuthContext, type AuthContextValue } from '@/modules/auth/viewmodels/authContext'

const SESSION_HINT_KEY = 'edutrack:has-session'
const PUBLIC_ENTRY_PATHS = new Set(['/', '/login', '/register', '/forgot-password'])

const hasSessionHint = (): boolean => {
  if (typeof window === 'undefined') return false
  try {
    return window.localStorage.getItem(SESSION_HINT_KEY) === '1'
  } catch {
    return false
  }
}

const setSessionHint = (hasSession: boolean): void => {
  if (typeof window === 'undefined') return
  try {
    if (hasSession) window.localStorage.setItem(SESSION_HINT_KEY, '1')
    else window.localStorage.removeItem(SESSION_HINT_KEY)
  } catch {
    // Storage may be unavailable in a restricted browser context.
  }
}

const shouldRestoreSession = (): boolean => {
  if (typeof window === 'undefined') return true
  return hasSessionHint() || !PUBLIC_ENTRY_PATHS.has(window.location.pathname)
}

export function AuthProvider({ children }: PropsWithChildren) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [isLoading, setIsLoading] = useState(shouldRestoreSession)

  useEffect(() => {
    let active = true
    const restore = async () => {
      try {
        const result = await authApi.me()
        if (active) {
          setUser(result.data.user)
          setSessionHint(true)
        }
      } catch {
        if (active) {
          setUser(null)
          setSessionHint(false)
        }
      } finally {
        if (active) setIsLoading(false)
      }
    }

    if (shouldRestoreSession()) void restore()

    const handleSessionExpired = () => {
      setUser(null)
      setSessionHint(false)
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
      setSessionHint(false)
      setUser(null)
    }
  }, [])

  const setAuthenticatedUser = useCallback((authenticatedUser: AuthUser) => {
    setSessionHint(true)
    setUser(authenticatedUser)
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({ user, isLoading, setAuthenticatedUser, logout }),
    [isLoading, logout, setAuthenticatedUser, user],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
