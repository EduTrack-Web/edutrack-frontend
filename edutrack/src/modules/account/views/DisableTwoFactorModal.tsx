import { useEffect, useState } from 'react'

import { ApiError } from '@/shared/api/httpClient'
import { Icon } from '@/shared/components/Icon'
import { useToast } from '@/shared/viewmodels/useToast'
import type { Disable2faPayload } from '@/modules/account/models/account.types'
import { accountApi } from '@/modules/account/services/accountApi'

interface DisableTwoFactorModalProps {
  isOpen: boolean
  initialOtpId?: string | null
  hasPassword?: boolean
  userEmail: string
  onClose: () => void
  onSuccess: () => void
}

export function DisableTwoFactorModal({
  isOpen,
  initialOtpId,
  hasPassword = true,
  userEmail,
  onClose,
  onSuccess,
}: DisableTwoFactorModalProps) {
  const { showToast } = useToast()

  // State xác thực qua mật khẩu
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  // State xác thực qua OTP (dành cho tài khoản Google chưa tạo mật khẩu)
  const [otp, setOtp] = useState('')
  const [resendOtpId, setResendOtpId] = useState<string | null>(null)
  const otpId = resendOtpId ?? initialOtpId ?? null
  const [isSendingOtp, setIsSendingOtp] = useState(false)
  const [resendCooldown, setResendCooldown] = useState(10)

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Đếm ngược 10 giây cho nút gửi lại OTP
  useEffect(() => {
    if (hasPassword || resendCooldown <= 0) return
    const timer = window.setInterval(() => {
      setResendCooldown((prev) => prev - 1)
    }, 1000)
    return () => window.clearInterval(timer)
  }, [hasPassword, resendCooldown])

  // Đóng modal bằng phím Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !isSubmitting) {
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, isSubmitting, onClose])

  if (!isOpen) return null

  // Gửi lại mã OTP
  const handleResendOtp = async () => {
    if (resendCooldown > 0 || isSendingOtp) return
    setIsSendingOtp(true)
    setError(null)
    try {
      const response = await accountApi.send2faOtp()
      setResendOtpId(response.data.otpId)
      setResendCooldown(10)
      showToast('Mã OTP mới đã được gửi đến email.', 'info')
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Không thể gửi lại mã OTP.'
      setError(msg)
      showToast(msg, 'error')
    } finally {
      setIsSendingOtp(false)
    }
  }

  // Submit tắt 2FA
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    const cleanOtp = otp.trim()

    if (hasPassword) {
      if (!password) {
        setError('Vui lòng nhập mật khẩu hiện tại để xác nhận tắt 2FA.')
        return
      }
    } else {
      if (!otpId || cleanOtp.length !== 6) {
        setError('Vui lòng nhập đủ 6 chữ số của mã xác thực.')
        return
      }
    }

    setIsSubmitting(true)
    try {
      const payload: Disable2faPayload = hasPassword
        ? { password }
        : { otp: cleanOtp, code: cleanOtp, otpId: otpId ?? '' }
      const response = await accountApi.disable2fa(payload)
      showToast(response.message ?? 'Đã tắt tính năng xác thực 2 bước thành công.', 'success')
      onSuccess()
      onClose()
    } catch (err) {
      const msg =
        err instanceof ApiError ? err.message : 'Không thể tắt 2FA lúc này. Vui lòng thử lại sau.'
      setError(msg)
      showToast(msg, 'error')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div
      aria-labelledby="disable-2fa-title"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
    >
      {/* Nền làm mờ */}
      <div
        aria-hidden="true"
        className="fixed inset-0 bg-palette-900/60 backdrop-blur-sm transition-opacity"
        onClick={() => {
          if (!isSubmitting) onClose()
        }}
      />

      {/* Thẻ Modal */}
      <div className="relative w-full max-w-md overflow-hidden rounded-3xl border border-palette-200/80 bg-white/95 p-6 shadow-2xl backdrop-blur-xl dark:border-white/10 dark:bg-palette-900/95 sm:p-7 animate-in fade-in zoom-in-95 duration-200">
        {/* Nút đóng */}
        <button
          aria-label="Đóng cửa sổ tắt 2FA"
          className="absolute right-4 top-4 grid size-8 place-items-center rounded-xl text-slate-400 transition hover:bg-palette-100 hover:text-slate-700 dark:hover:bg-white/10 dark:hover:text-white"
          disabled={isSubmitting}
          onClick={onClose}
          type="button"
        >
          <Icon className="size-5" name="close" />
        </button>

        {/* Tiêu đề & Icon cảnh báo */}
        <div className="flex items-center gap-3.5">
          <span className="grid size-12 place-items-center rounded-2xl bg-amber-500/15 text-amber-600 dark:bg-amber-400/20 dark:text-amber-300">
            <Icon className="size-6" name="warning" />
          </span>
          <div>
            <h2
              className="text-lg font-black tracking-tight text-palette-900 dark:text-white"
              id="disable-2fa-title"
            >
              Tắt xác thực 2 bước (2FA)
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Xác thực danh tính trước khi giảm mức bảo mật
            </p>
          </div>
        </div>

        {/* Cảnh báo rủi ro */}
        <div className="mt-4 rounded-2xl border border-amber-500/20 bg-amber-50/70 p-3.5 text-xs text-amber-900 dark:border-amber-400/20 dark:bg-amber-950/40 dark:text-amber-200">
          <p className="font-semibold leading-relaxed">
            Khi tắt xác thực 2 bước, tài khoản của bạn sẽ chỉ được bảo vệ bằng một lớp mật khẩu hoặc tài khoản liên kết. Hãy cân nhắc kỹ trước khi thực hiện.
          </p>
        </div>

        <form className="mt-5 space-y-4" noValidate onSubmit={handleSubmit}>
          {hasPassword ? (
            /* Trường hợp 1: Nhập mật khẩu hiện tại */
            <div>
              <label
                className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300"
                htmlFor="currentPassword"
              >
                Mật khẩu hiện tại <span className="text-rose-500">*</span>
              </label>
              <div className="relative mt-2">
                <input
                  aria-describedby={error ? 'disable-2fa-error' : undefined}
                  aria-invalid={Boolean(error)}
                  autoComplete="current-password"
                  autoFocus
                  className={`block w-full rounded-2xl border bg-white/70 px-4 py-3 pr-11 text-sm font-medium text-slate-800 transition outline-none placeholder:text-slate-400 focus:ring-4 dark:bg-white/5 dark:text-white ${
                    error
                      ? 'border-rose-500 focus:border-rose-500 focus:ring-rose-500/20'
                      : 'border-palette-200/80 focus:border-palette-700 focus:ring-palette-200/40 dark:border-white/10 dark:focus:border-palette-200'
                  }`}
                  disabled={isSubmitting}
                  id="currentPassword"
                  name="currentPassword"
                  onChange={(e) => {
                    setPassword(e.target.value)
                    if (error) setError(null)
                  }}
                  placeholder="Nhập mật khẩu của bạn để xác nhận"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                />
                <button
                  aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                  className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-slate-400 transition hover:text-slate-600 dark:hover:text-slate-200"
                  onClick={() => setShowPassword((prev) => !prev)}
                  tabIndex={-1}
                  type="button"
                >
                  <Icon className="size-4" name={showPassword ? 'eyeOff' : 'eye'} />
                </button>
              </div>
            </div>
          ) : (
            /* Trường hợp 2: Xác nhận qua OTP (khi chưa có mật khẩu) */
            <div>
              <div className="flex items-center justify-between">
                <label
                  className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300"
                  htmlFor="disableOtp"
                >
                  Mã OTP xác thực email <span className="text-rose-500">*</span>
                </label>
                <button
                  className="text-xs font-bold text-palette-700 transition hover:underline disabled:opacity-50 dark:text-palette-200"
                  disabled={resendCooldown > 0 || isSendingOtp || isSubmitting}
                  onClick={() => void handleResendOtp()}
                  type="button"
                >
                  {isSendingOtp
                    ? 'Đang gửi…'
                    : resendCooldown > 0
                    ? `Gửi lại sau ${resendCooldown}s`
                    : 'Gửi lại mã'}
                </button>
              </div>

              <input
                aria-describedby={error ? 'disable-2fa-error' : undefined}
                aria-invalid={Boolean(error)}
                autoComplete="one-time-code"
                autoFocus
                className={`mt-2 block w-full rounded-2xl border bg-white/70 px-4 py-3 text-center font-mono text-xl font-bold tracking-[0.4em] transition outline-none placeholder:font-sans placeholder:text-sm placeholder:tracking-normal focus:ring-4 dark:bg-white/5 dark:text-white ${
                  error
                    ? 'border-rose-500 focus:border-rose-500 focus:ring-rose-500/20'
                    : 'border-palette-200/80 focus:border-palette-700 focus:ring-palette-200/40 dark:border-white/10 dark:focus:border-palette-200'
                }`}
                disabled={isSubmitting}
                id="disableOtp"
                inputMode="numeric"
                maxLength={6}
                name="disableOtp"
                onChange={(e) => {
                  const cleaned = e.target.value.replace(/\D/g, '').slice(0, 6)
                  setOtp(cleaned)
                  if (error) setError(null)
                }}
                placeholder="• • • • • •"
                type="text"
                value={otp}
              />
              <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                Mã xác thực gồm 6 số được gửi tới <span className="font-semibold text-slate-700 dark:text-slate-300">{userEmail}</span>
              </p>
            </div>
          )}

          {/* Thông báo lỗi nếu có */}
          {error && (
            <div
              className="flex items-center gap-2 rounded-xl bg-rose-50 p-2.5 text-xs font-bold text-rose-600 dark:bg-rose-950/40 dark:text-rose-400 animate-in fade-in duration-150"
              id="disable-2fa-error"
            >
              <Icon className="size-4 shrink-0" name="error" />
              <span>{error}</span>
            </div>
          )}

          {/* Các nút hành động */}
          <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button
              className="inline-flex h-11 items-center justify-center rounded-2xl border border-slate-300 bg-white/70 px-5 text-xs font-bold text-slate-700 transition hover:bg-slate-100 active:scale-95 disabled:opacity-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10"
              disabled={isSubmitting}
              onClick={onClose}
              type="button"
            >
              Hủy bỏ
            </button>

            <button
              className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-rose-600 px-5 text-xs font-bold text-white shadow-md shadow-rose-600/20 transition hover:bg-rose-700 active:scale-95 disabled:opacity-50"
              disabled={isSubmitting || (hasPassword ? !password : (!otpId || otp.trim().length !== 6))}
              type="submit"
            >
              {isSubmitting ? (
                <>
                  <span className="size-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  <span>Đang xử lý…</span>
                </>
              ) : (
                <span>Xác nhận tắt 2FA</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
