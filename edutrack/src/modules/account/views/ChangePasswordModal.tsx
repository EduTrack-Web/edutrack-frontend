import { useEffect } from 'react'

import { Icon } from '@/shared/components/Icon'
import { useChangePasswordViewModel } from '@/modules/account/viewmodels/useChangePasswordViewModel'

interface ChangePasswordModalProps {
  isOpen: boolean
  hasPassword?: boolean
  onClose: () => void
  onSuccess?: () => void
}

export function ChangePasswordModal({
  isOpen,
  hasPassword = true,
  onClose,
  onSuccess,
}: ChangePasswordModalProps) {
  const {
    form,
    visibility,
    isSubmitting,
    fieldErrors,
    setLogoutOtherDevices,
    handleFieldChange,
    handleSubmit,
    resetForm,
  } = useChangePasswordViewModel({
    hasPassword,
    onSuccess: () => {
      onSuccess?.()
      onClose()
    },
  })

  // Đóng bằng phím Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !isSubmitting) {
        resetForm()
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, isSubmitting, onClose, resetForm])

  if (!isOpen) return null

  const handleCancel = () => {
    resetForm()
    onClose()
  }

  return (
    <div
      aria-labelledby="change-password-modal-title"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-palette-950/60 backdrop-blur-xs animate-in fade-in duration-200"
      role="dialog"
    >
      {/* Backdrop click to close */}
      <div className="fixed inset-0" onClick={isSubmitting ? undefined : handleCancel} />

      <div className="relative w-full max-w-lg overflow-hidden rounded-3xl border border-palette-200/80 bg-white/95 p-6 shadow-2xl backdrop-blur-xl dark:border-white/10 dark:bg-palette-900/95 sm:p-8">
        {/* Header Modal */}
        <div className="flex items-center justify-between border-b border-palette-200/70 pb-4 dark:border-white/10">
          <div className="flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-2xl bg-palette-100 text-palette-700 dark:bg-white/10 dark:text-palette-200">
              <Icon className="size-5" name="lock" />
            </span>
            <div>
              <h2
                className="text-lg font-black tracking-tight text-palette-900 dark:text-white"
                id="change-password-modal-title"
              >
                {hasPassword ? 'Đổi mật khẩu tài khoản' : 'Thiết lập mật khẩu mới'}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {hasPassword
                  ? 'Bảo vệ tài khoản bằng mật khẩu mạnh và an toàn'
                  : 'Tài khoản Google có thể tạo mật khẩu để đăng nhập trực tiếp'}
              </p>
            </div>
          </div>

          <button
            aria-label="Đóng hộp thoại"
            className="grid size-8 place-items-center rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition dark:hover:bg-white/10 dark:hover:text-white"
            disabled={isSubmitting}
            onClick={handleCancel}
            type="button"
          >
            <Icon className="size-5" name="close" />
          </button>
        </div>

        {/* Form Đổi mật khẩu */}
        <form noValidate className="mt-5 space-y-4" onSubmit={handleSubmit}>
          {/* Mật khẩu hiện tại */}
          {hasPassword && (
            <div>
              <label
                className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300"
                htmlFor="currentPassword"
              >
                Mật khẩu hiện tại <span className="text-rose-500">*</span>
              </label>
              <div className="relative mt-2">
                <input
                  aria-describedby={fieldErrors.currentPassword ? 'currentPassword-error' : undefined}
                  aria-invalid={Boolean(fieldErrors.currentPassword)}
                  autoComplete="current-password"
                  className={`block w-full rounded-2xl border bg-white/70 px-4 py-3 pr-11 text-sm font-medium text-slate-800 transition outline-none placeholder:text-slate-400 focus:ring-4 dark:bg-white/5 dark:text-white ${
                    fieldErrors.currentPassword
                      ? 'border-rose-500 focus:border-rose-500 focus:ring-rose-500/20'
                      : 'border-palette-200/80 focus:border-palette-700 focus:ring-palette-200/40 dark:border-white/10 dark:focus:border-palette-200'
                  }`}
                  disabled={isSubmitting}
                  id="currentPassword"
                  name="currentPassword"
                  onChange={(e) => handleFieldChange('currentPassword', e.target.value)}
                  placeholder="Nhập mật khẩu đang sử dụng"
                  type={visibility.showCurrentPassword ? 'text' : 'password'}
                  value={form.currentPassword}
                />
                <button
                  aria-label={visibility.showCurrentPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                  className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                  onClick={visibility.toggleCurrentPassword}
                  tabIndex={-1}
                  type="button"
                >
                  <Icon className="size-4" name={visibility.showCurrentPassword ? 'eyeOff' : 'eye'} />
                </button>
              </div>
              {fieldErrors.currentPassword && (
                <p
                  className="mt-1.5 flex items-center gap-1 text-xs font-bold text-rose-600 dark:text-rose-400"
                  id="currentPassword-error"
                >
                  <Icon className="size-3.5 shrink-0" name="error" />
                  <span>{fieldErrors.currentPassword}</span>
                </p>
              )}
            </div>
          )}

          {/* Mật khẩu mới */}
          <div>
            <label
              className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300"
              htmlFor="newPassword"
            >
              Mật khẩu mới <span className="text-rose-500">*</span>
            </label>
            <div className="relative mt-2">
              <input
                aria-describedby={fieldErrors.newPassword ? 'newPassword-error' : undefined}
                aria-invalid={Boolean(fieldErrors.newPassword)}
                autoComplete="new-password"
                className={`block w-full rounded-2xl border bg-white/70 px-4 py-3 pr-11 text-sm font-medium text-slate-800 transition outline-none placeholder:text-slate-400 focus:ring-4 dark:bg-white/5 dark:text-white ${
                  fieldErrors.newPassword
                    ? 'border-rose-500 focus:border-rose-500 focus:ring-rose-500/20'
                    : 'border-palette-200/80 focus:border-palette-700 focus:ring-palette-200/40 dark:border-white/10 dark:focus:border-palette-200'
                }`}
                disabled={isSubmitting}
                id="newPassword"
                name="newPassword"
                onChange={(e) => handleFieldChange('newPassword', e.target.value)}
                placeholder="Nhập mật khẩu mới từ 8–64 ký tự"
                type={visibility.showNewPassword ? 'text' : 'password'}
                value={form.newPassword}
              />
              <button
                aria-label={visibility.showNewPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                onClick={visibility.toggleNewPassword}
                tabIndex={-1}
                type="button"
              >
                <Icon className="size-4" name={visibility.showNewPassword ? 'eyeOff' : 'eye'} />
              </button>
            </div>
            {fieldErrors.newPassword && (
              <p
                className="mt-1.5 flex items-center gap-1 text-xs font-bold text-rose-600 dark:text-rose-400"
                id="newPassword-error"
              >
                <Icon className="size-3.5 shrink-0" name="error" />
                <span>{fieldErrors.newPassword}</span>
              </p>
            )}
            <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
              Mật khẩu phải từ 8 đến 64 ký tự, gồm chữ hoa, chữ thường, chữ số và ký tự đặc biệt.
            </p>
          </div>

          {/* Xác nhận mật khẩu mới */}
          <div>
            <label
              className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300"
              htmlFor="confirmPassword"
            >
              Xác nhận mật khẩu mới <span className="text-rose-500">*</span>
            </label>
            <div className="relative mt-2">
              <input
                aria-describedby={fieldErrors.confirmPassword ? 'confirmPassword-error' : undefined}
                aria-invalid={Boolean(fieldErrors.confirmPassword)}
                autoComplete="new-password"
                className={`block w-full rounded-2xl border bg-white/70 px-4 py-3 pr-11 text-sm font-medium text-slate-800 transition outline-none placeholder:text-slate-400 focus:ring-4 dark:bg-white/5 dark:text-white ${
                  fieldErrors.confirmPassword
                    ? 'border-rose-500 focus:border-rose-500 focus:ring-rose-500/20'
                    : 'border-palette-200/80 focus:border-palette-700 focus:ring-palette-200/40 dark:border-white/10 dark:focus:border-palette-200'
                }`}
                disabled={isSubmitting}
                id="confirmPassword"
                name="confirmPassword"
                onChange={(e) => handleFieldChange('confirmPassword', e.target.value)}
                placeholder="Nhập lại mật khẩu mới"
                type={visibility.showConfirmPassword ? 'text' : 'password'}
                value={form.confirmPassword}
              />
              <button
                aria-label={visibility.showConfirmPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                onClick={visibility.toggleConfirmPassword}
                tabIndex={-1}
                type="button"
              >
                <Icon className="size-4" name={visibility.showConfirmPassword ? 'eyeOff' : 'eye'} />
              </button>
            </div>
            {fieldErrors.confirmPassword && (
              <p
                className="mt-1.5 flex items-center gap-1 text-xs font-bold text-rose-600 dark:text-rose-400"
                id="confirmPassword-error"
              >
                <Icon className="size-3.5 shrink-0" name="error" />
                <span>{fieldErrors.confirmPassword}</span>
              </p>
            )}
          </div>

          {/* Tùy chọn Đăng xuất các thiết bị khác */}
          <div className="pt-2">
            <label className="flex items-start gap-3 cursor-pointer select-none">
              <input
                checked={form.logoutOtherDevices}
                className="mt-0.5 size-4 rounded-md border-slate-300 text-palette-700 focus:ring-palette-500 dark:border-white/20"
                disabled={isSubmitting}
                onChange={(e) => setLogoutOtherDevices(e.target.checked)}
                type="checkbox"
              />
              <div>
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  Đăng xuất khỏi tất cả các thiết bị khác
                </span>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Khuyến nghị để đảm bảo an toàn nếu bạn nghi ngờ tài khoản bị rò rỉ thông tin.
                </p>
              </div>
            </label>
          </div>

          {/* Các nút hành động */}
          <div className="flex flex-col-reverse gap-3 pt-4 sm:flex-row sm:justify-end">
            <button
              className="inline-flex h-11 w-full items-center justify-center rounded-2xl border border-slate-300 bg-white/70 px-5 text-xs font-bold text-slate-700 transition hover:bg-slate-100 active:scale-95 disabled:opacity-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10 sm:w-auto"
              disabled={isSubmitting}
              onClick={handleCancel}
              type="button"
            >
              Hủy bỏ
            </button>

            <button
              className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-palette-900 via-palette-800 to-palette-700 px-6 text-xs font-bold text-white shadow-md shadow-palette-900/20 transition hover:opacity-95 active:scale-95 disabled:opacity-50 sm:w-auto"
              disabled={isSubmitting}
              type="submit"
            >
              {isSubmitting ? (
                <>
                  <span className="size-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  <span>Đang xử lý…</span>
                </>
              ) : (
                <>
                  <Icon className="size-4" name="check" />
                  <span>{hasPassword ? 'Cập nhật mật khẩu' : 'Tạo mật khẩu'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

