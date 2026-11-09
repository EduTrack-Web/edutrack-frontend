import { useCallback, useMemo, useRef, useState, type PropsWithChildren } from 'react'

import type { ToastLevel, ToastMessage } from '../models/toast'
import { Icon, type IconName } from '../components/Icon'
import { ToastContext } from './toastContext'

const iconByLevel: Record<ToastLevel, IconName> = { error: 'error', warning: 'warning', info: 'info', success: 'check' }
const labelByLevel: Record<ToastLevel, string> = { error: 'Lỗi', warning: 'Cảnh báo', info: 'Thông tin', success: 'Thành công' }

export function ToastProvider({ children }: PropsWithChildren) {
  const [toasts, setToasts] = useState<ToastMessage[]>([])
  const nextId = useRef(0)
  const remove = useCallback((id: number) => setToasts((current) => current.filter((toast) => toast.id !== id)), [])
  const showToast = useCallback((message: string, level: ToastLevel = 'info') => {
    const id = ++nextId.current
    setToasts((current) => [...current, { id, message, level }].slice(-4))
    window.setTimeout(() => remove(id), 5000)
  }, [remove])
  const value = useMemo(() => ({ showToast }), [showToast])

  return <ToastContext.Provider value={value}>{children}<div className="pointer-events-none fixed right-3 top-3 z-[100] flex w-[calc(100%-1.5rem)] max-w-sm flex-col gap-3 sm:right-4 sm:top-4" aria-live="polite">{toasts.map((toast) => <div className={`toast toast-${toast.level}`} key={toast.id} role={toast.level === 'error' ? 'alert' : 'status'}><span className="toast-icon"><Icon name={iconByLevel[toast.level]} /></span><div className="min-w-0 flex-1"><p className="text-sm font-black">{labelByLevel[toast.level]}</p><p className="mt-1 text-sm leading-5">{toast.message}</p></div><button className="pointer-events-auto grid size-8 shrink-0 place-items-center rounded-full hover:bg-black/5" aria-label="Đóng thông báo" type="button" onClick={() => remove(toast.id)}><Icon className="size-4" name="close" /></button></div>)}</div></ToastContext.Provider>
}
