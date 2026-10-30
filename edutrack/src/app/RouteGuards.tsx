import type { PropsWithChildren } from 'react'
import { Navigate, useLocation } from 'react-router-dom'

import { useAuth } from '../modules/auth/viewmodels/useAuth'

function LoadingScreen() {
  return <div className="grid min-h-screen place-items-center"><div className="glass-panel rounded-3xl px-6 py-4 text-sm font-bold text-palette-950 dark:text-white">Đang khôi phục phiên đăng nhập…</div></div>
}

export function RequireAuth({ children }: PropsWithChildren) {
  const { user, isLoading } = useAuth()
  const location = useLocation()
  if (isLoading) return <LoadingScreen />
  if (!user) return <Navigate replace state={{ from: location }} to="/login" />
  return children
}

export function GuestOnly({ children }: PropsWithChildren) {
  const { user, isLoading } = useAuth()
  if (isLoading) return <LoadingScreen />
  if (user) return <Navigate replace to="/dashboard" />
  return children
}
