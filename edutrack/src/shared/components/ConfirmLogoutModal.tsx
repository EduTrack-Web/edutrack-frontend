import { useEffect } from 'react'

import { Icon } from './Icon'

interface ConfirmLogoutModalProps {
  isOpen: boolean
  isLoading?: boolean
  onClose: () => void
  onConfirm: () => void
}

export function ConfirmLogoutModal({
  isOpen,
  isLoading = false,
  onClose,
  onConfirm,
}: ConfirmLogoutModalProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !isLoading) {
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, isLoading, onClose])

  if (!isOpen) return null

  return (
    <div
      aria-labelledby="confirm-logout-modal-title"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-palette-950/60 backdrop-blur-xs animate-in fade-in duration-200"
      role="dialog"
    >
      {/* Backdrop */}
      <div className="fixed inset-0" onClick={isLoading ? undefined : onClose} />

      <div className="relative w-full max-w-md overflow-hidden rounded-3xl border border-rose-200/80 bg-white/95 p-6 shadow-2xl backdrop-blur-xl dark:border-rose-900/40 dark:bg-palette-900/95 sm:p-7">
        <div className="flex flex-col items-center text-center">
          {/* Icon Đăng xuất nổi bật */}
          <span className="grid size-14 place-items-center rounded-3xl border border-rose-200 bg-rose-50 text-rose-600 shadow-sm dark:border-rose-500/20 dark:bg-rose-950/40 dark:text-rose-400">
            <Icon className="size-7" name="login" />
          </span>

          <h2
            className="mt-4 text-xl font-black tracking-tight text-palette-900 dark:text-white"
            id="confirm-logout-modal-title"
          >
            Xác nhận đăng xuất
          </h2>

          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
            Bạn có chắc chắn muốn đăng xuất khỏi phiên làm việc hiện tại trên EduTrack không?
          </p>

          {/* Cặp nút Hủy & Xác nhận */}
          <div className="mt-6 flex w-full flex-col-reverse gap-3 sm:flex-row">
            <button
              className="inline-flex h-11 flex-1 items-center justify-center rounded-2xl border border-slate-300 bg-white/70 px-4 text-xs font-bold text-slate-700 transition hover:bg-slate-100 active:scale-95 disabled:opacity-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10"
              disabled={isLoading}
              onClick={onClose}
              type="button"
            >
              Hủy bỏ
            </button>

            <button
              className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-rose-600 to-rose-700 px-4 text-xs font-bold text-white shadow-md shadow-rose-600/25 transition hover:opacity-95 active:scale-95 disabled:opacity-50"
              disabled={isLoading}
              onClick={onConfirm}
              type="button"
            >
              {isLoading ? (
                <>
                  <span className="size-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  <span>Đang đăng xuất…</span>
                </>
              ) : (
                <>
                  <Icon className="size-4" name="login" />
                  <span>Đăng xuất</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

