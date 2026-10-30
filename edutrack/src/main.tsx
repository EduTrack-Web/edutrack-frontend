import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router-dom'

import { router } from './app/router'
import { AuthProvider } from './modules/auth/viewmodels/AuthProvider'
import { ThemeProvider } from './shared/viewmodels/ThemeProvider'
import { ToastProvider } from './shared/viewmodels/ToastProvider'
import './index.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      <ToastProvider>
        <AuthProvider>
          <RouterProvider router={router} />
        </AuthProvider>
      </ToastProvider>
    </ThemeProvider>
  </StrictMode>,
)
