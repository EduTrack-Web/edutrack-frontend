import { useEffect } from 'react'

import { Icon } from '../../../shared/components/Icon'

interface ConfirmUnlinkGoogleModalProps {
  isOpen: boolean
  isLoading: boolean
  hasPassword?: boolean
  onClose: () => void
  onConfirm: () => void
  onOpenChangePassword: () => void
}

export function ConfirmUnlinkGoogleModal({
  isOpen,
  isLoading,
  hasPassword = true,
  onClose,
  onConfirm,
  onOpenChangePassword,
}: ConfirmUnlinkGoogleModalProps) {
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
      aria-labelledby="confirm-unlink-title"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
    >
      {/* Backdrop */}
      <div
        aria-hidden="true"
        className="fixed inset-0 bg-palette-900/60 backdrop-blur-sm transition-opacity"
        onClick={() => {
          if (!isLoading) onClose()
        }}
      />

      {/* Modal card */}
      <div className="relative w-full max-w-md overflow-hidden rounded-3xl border border-palette-200/80 bg-white/95 p-6 shadow-2xl backdrop-blur-xl dark:border-white/10 dark:bg-palette-900/95 sm:p-7 animate-in fade-in zoom-in-95 duration-200">
        <button
          aria-label="Đóng cửa sổ xác nhận"
          className="absolute right-4 top-4 grid size-8 place-items-center rounded-xl text-slate-400 transition hover:bg-palette-100 hover:text-slate-700 dark:hover:bg-white/10 dark:hover:text-white"
          disabled={isLoading}
          onClick={onClose}
          type="button"
        >
          <Icon className="size-5" name="close" />
        </button>

        {!hasPassword ? (
          /* Trường hợp chưa có mật khẩu: Không cho phép hủy liên kết */
          <div className="space-y-4">
            <div className="flex items-center gap-3.5">
              <span className="grid size-12 place-items-center rounded-2xl bg-rose-500/15 text-rose-600 dark:bg-rose-400/20 dark:text-rose-300">
                <Icon className="size-6" name="warning" />
              </span>
              <div>
                <h2
                  className="text-lg font-black tracking-tight text-palette-900 dark:text-white"
                  id="confirm-unlink-title"
                >
                  Không thể hủy liên kết
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Cần thiết lập mật khẩu bảo vệ tài khoản
                </p>
              </div>
            </div>

            <div className="rounded-2xl border border-rose-500/20 bg-rose-50/70 p-4 text-xs font-medium leading-relaxed text-rose-900 dark:border-rose-400/20 dark:bg-rose-950/40 dark:text-rose-200">
              Tài khoản của bạn được tạo qua Google và hiện <strong className="font-bold">chưa có mật khẩu đăng nhập</strong>. Nếu hủy liên kết Google, bạn sẽ bị mất quyền truy cập vào tài khoản EduTrack này.
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300">
              Vui lòng bấm nút bên dưới để tạo mật khẩu đăng nhập trước khi hủy liên kết tài khoản Google.
            </p>

            <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                className="inline-flex h-11 items-center justify-center rounded-2xl border border-slate-300 bg-white/70 px-5 text-xs font-bold text-slate-700 transition hover:bg-slate-100 active:scale-95 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10"
                onClick={onClose}
                type="button"
              >
                Đóng
              </button>
              <button
                className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-palette-700 px-5 text-xs font-bold text-white shadow-md transition hover:bg-palette-800 active:scale-95 dark:bg-palette-200 dark:text-palette-900 dark:hover:bg-white"
                onClick={() => {
                  onClose()
                  onOpenChangePassword()
                }}
                type="button"
              >
                <Icon className="size-4" name="lock" />
                <span>Thiết lập mật khẩu ngay</span>
              </button>
            </div>
          </div>
        ) : (
          /* Trường hợp đã có mật khẩu: Hỏi xác nhận hủy liên kết */
          <div className="space-y-4">
            <div className="flex items-center gap-3.5">
              <span className="grid size-12 place-items-center rounded-2xl bg-rose-500/15 text-rose-600 dark:bg-rose-400/20 dark:text-rose-300">
                <Icon className="size-6" name="warning" />
              </span>
              <div>
                <h2
                  className="text-lg font-black tracking-tight text-palette-900 dark:text-white"
                  id="confirm-unlink-title"
                >
                  Hủy liên kết Google?
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Xác nhận gỡ bỏ phương thức đăng nhập bằng Google
                </p>
              </div>
            </div>

            <p className="text-xs font-medium leading-relaxed text-slate-600 dark:text-slate-300">
              Sau khi hủy liên kết, bạn sẽ không thể sử dụng nút <span className="font-bold">Đăng nhập bằng Google</span> cho tài khoản này nữa. Bạn vẫn có thể đăng nhập bình thường bằng email hoặc tên đăng nhập và mật khẩu của mình.
            </p>

            <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                className="inline-flex h-11 items-center justify-center rounded-2xl border border-slate-300 bg-white/70 px-5 text-xs font-bold text-slate-700 transition hover:bg-slate-100 active:scale-95 disabled:opacity-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10"
                disabled={isLoading}
                onClick={onClose}
                type="button"
              >
                Giữ liên kết
              </button>

              <button
                className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-rose-600 px-5 text-xs font-bold text-white shadow-md shadow-rose-600/20 transition hover:bg-rose-700 active:scale-95 disabled:opacity-50"
                disabled={isLoading}
                onClick={onConfirm}
                type="button"
              >
                {isLoading ? (
                  <>
                    <span className="size-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    <span>Đang hủy liên kết…</span>
                  </>
                ) : (
                  <span>Xác nhận hủy liên kết</span>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

