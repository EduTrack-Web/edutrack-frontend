import { createContext } from 'react'

import type { AuthUser } from '../models/AuthUser'

export interface AuthContextValue {
  user: AuthUser | null
  isLoading: boolean
  setAuthenticatedUser: (user: AuthUser) => void
  logout: () => Promise<void>
}

export const AuthContext = createContext<AuthContextValue | null>(null)
