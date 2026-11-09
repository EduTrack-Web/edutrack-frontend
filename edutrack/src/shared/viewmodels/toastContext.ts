import { createContext } from 'react'

import type { ToastLevel } from '../models/toast'

export interface ToastContextValue { showToast: (message: string, level?: ToastLevel) => void }
export const ToastContext = createContext<ToastContextValue | null>(null)
