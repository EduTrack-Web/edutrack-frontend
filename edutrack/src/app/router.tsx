import { createBrowserRouter } from 'react-router-dom'

import { ForgotPasswordPage } from '../modules/auth/views/ForgotPasswordPage'
import { LoginPage } from '../modules/auth/views/LoginPage'
import { RegisterPage } from '../modules/auth/views/RegisterPage'
import { AccountPage } from '../modules/account/views/AccountPage'
import { DashboardPage } from '../modules/dashboard/views/DashboardPage'
import { LandingPage } from '../modules/landing/views/LandingPage'
import { PublicLayout } from '../shared/components/layout/PublicLayout'
import { App } from './App'
import { GuestOnly, RequireAuth } from './RouteGuards'

export const router = createBrowserRouter([
  {
    element: <PublicLayout />,
    children: [
      { path: '/', element: <LandingPage /> },
      { path: '/login', element: <GuestOnly><LoginPage /></GuestOnly> },
      { path: '/register', element: <GuestOnly><RegisterPage /></GuestOnly> },
      { path: '/forgot-password', element: <GuestOnly><ForgotPasswordPage /></GuestOnly> },
    ],
  },
  {
    element: <RequireAuth><App /></RequireAuth>,
    children: [
      { path: '/dashboard', element: <DashboardPage /> },
      { path: '/account', element: <AccountPage /> },
    ],
  },
])
