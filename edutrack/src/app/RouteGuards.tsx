import type { PropsWithChildren } from 'react'
import { Navigate, useLocation } from 'react-router-dom'

import { useAuth } from '../modules/auth/viewmodels/useAuth'

function LoadingScreen() {
  return (
    <div className="grid min-h-screen place-items-center">
      <div className="glass-panel rounded-3xl px-6 py-4 text-sm font-bold text-palette-950 dark:text-white">
        Đang khôi phục phiên đăng nhập…
      </div>
    </div>
  )
}

export function RequireAuth({ children }: PropsWithChildren) {
  const { user, isLoading } = useAuth()
  const location = useLocation()

  if (isLoading) return <LoadingScreen />
  if (!user) return <Navigate replace state={{ from: location }} to="/login" />

  // Nếu người dùng chưa hoàn tất khảo sát hồ sơ, điều hướng đến wizard /onboarding
  if (!user.profileCompleted && location.pathname !== '/onboarding') {
    return <Navigate replace to="/onboarding" />
  }

  // Nếu đã hoàn tất mà vẫn vào /onboarding, chuyển hướng đến /dashboard
  if (user.profileCompleted && location.pathname === '/onboarding') {
    return <Navigate replace to="/dashboard" />
  }

  return children
}

export function GuestOnly({ children }: PropsWithChildren) {
  const { user, isLoading } = useAuth()

  if (isLoading) return <LoadingScreen />
  if (user) {
    return <Navigate replace to={user.profileCompleted ? '/dashboard' : '/onboarding'} />
  }

  return children
}
