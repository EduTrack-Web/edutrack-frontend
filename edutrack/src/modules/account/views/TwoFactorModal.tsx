import { useEffect, useState } from 'react'

import { ApiError } from '../../../shared/api/httpClient'
import { Icon } from '../../../shared/components/Icon'
import { useToast } from '../../../shared/viewmodels/useToast'
import { accountApi } from '../services/accountApi'

interface TwoFactorModalProps {
  isOpen: boolean
  initialOtpId?: string | null
  userEmail: string
  onClose: () => void
  onSuccess: () => void
}

export function TwoFactorModal({
  isOpen,
  initialOtpId,
  userEmail,
  onClose,
  onSuccess,
}: TwoFactorModalProps) {
  const { showToast } = useToast()

  const [otp, setOtp] = useState('')
  const [resendOtpId, setResendOtpId] = useState<string | null>(null)
  const otpId = resendOtpId ?? initialOtpId ?? null
  const [isSendingOtp, setIsSendingOtp] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [resendCooldown, setResendCooldown] = useState(10)
  const [error, setError] = useState<string | null>(null)

  // Đếm ngược 10 giây cho nút gửi lại
  useEffect(() => {
    if (resendCooldown <= 0) return
    const timer = window.setInterval(() => {
      setResendCooldown((prev) => prev - 1)
    }, 1000)
    return () => window.clearInterval(timer)
  }, [resendCooldown])

  // Đóng modal bằng Escape
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

  // Gửi lại mã OTP chủ động khi người dùng bấm
  const handleResend = async () => {
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

  // Xác nhận kích hoạt 2FA
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const cleanOtp = otp.trim()
    if (!otpId || cleanOtp.length !== 6) {
      setError('Vui lòng nhập đủ 6 chữ số của mã xác thực.')
      return
    }

    setIsSubmitting(true)
    setError(null)
    try {
      const response = await accountApi.enable2fa({
        otpId,
        code: cleanOtp,
        otp: cleanOtp,
      })
      showToast(response.message ?? 'Đã kích hoạt xác thực 2 bước thành công!', 'success')
      onSuccess()
      onClose()
    } catch (err) {
      const msg =
        err instanceof ApiError ? err.message : 'Xác thực OTP thất bại. Vui lòng thử lại.'
      setError(msg)
      showToast(msg, 'error')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div
      aria-labelledby="two-factor-title"
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
          aria-label="Đóng cửa sổ kích hoạt 2FA"
          className="absolute right-4 top-4 grid size-8 place-items-center rounded-xl text-slate-400 transition hover:bg-palette-100 hover:text-slate-700 dark:hover:bg-white/10 dark:hover:text-white"
          disabled={isSubmitting}
          onClick={onClose}
          type="button"
        >
          <Icon className="size-5" name="close" />
        </button>

        {/* Tiêu đề & Icon */}
        <div className="flex items-center gap-3.5">
          <span className="grid size-12 place-items-center rounded-2xl bg-palette-100 text-palette-700 dark:bg-white/10 dark:text-palette-200">
            <Icon className="size-6" name="lock" />
          </span>
          <div>
            <h2
              className="text-lg font-black tracking-tight text-palette-900 dark:text-white"
              id="two-factor-title"
            >
              Kích hoạt xác thực 2 bước
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Bảo vệ tài khoản qua mã OTP gửi đến Email
            </p>
          </div>
        </div>

        {/* Thông tin mô tả */}
        <div className="mt-4 rounded-2xl border border-palette-200/60 bg-palette-50/70 p-3.5 text-xs text-slate-600 dark:border-white/10 dark:bg-white/5 dark:text-slate-300">
          <p className="leading-relaxed">
            Hệ thống đã gửi một mã xác thực gồm 6 chữ số đến hộp thư{' '}
            <strong className="font-bold text-palette-900 dark:text-white">{userEmail}</strong>. Mã này có hiệu lực trong 10 phút.
          </p>
        </div>

        {/* Form nhập OTP */}
        <form className="mt-5 space-y-4" noValidate onSubmit={handleSubmit}>
          <div>
            <div className="flex items-center justify-between">
              <label
                className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300"
                htmlFor="otpCode"
              >
                Mã xác thực OTP <span className="text-rose-500">*</span>
              </label>

              <button
                className="text-xs font-bold text-palette-700 transition hover:underline disabled:opacity-50 dark:text-palette-200"
                disabled={resendCooldown > 0 || isSendingOtp || isSubmitting}
                onClick={() => void handleResend()}
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
              aria-describedby={error ? 'otp-error' : undefined}
              aria-invalid={Boolean(error)}
              autoComplete="one-time-code"
              autoFocus
              className={`mt-2 block w-full rounded-2xl border bg-white/70 px-4 py-3 text-center font-mono text-2xl font-bold tracking-[0.4em] transition outline-none placeholder:font-sans placeholder:text-sm placeholder:tracking-normal focus:ring-4 dark:bg-white/5 dark:text-white ${
                error
                  ? 'border-rose-500 focus:border-rose-500 focus:ring-rose-500/20'
                  : 'border-palette-200/80 focus:border-palette-700 focus:ring-palette-200/40 dark:border-white/10 dark:focus:border-palette-200'
              }`}
              disabled={isSubmitting}
              id="otpCode"
              inputMode="numeric"
              maxLength={6}
              name="otpCode"
              onChange={(e) => {
                const cleaned = e.target.value.replace(/\D/g, '').slice(0, 6)
                setOtp(cleaned)
                if (error) setError(null)
              }}
              placeholder="• • • • • •"
              type="text"
              value={otp}
            />
          </div>

          {/* Lỗi */}
          {error && (
            <div
              className="flex items-center gap-2 rounded-xl bg-rose-50 p-2.5 text-xs font-bold text-rose-600 dark:bg-rose-950/40 dark:text-rose-400 animate-in fade-in duration-150"
              id="otp-error"
            >
              <Icon className="size-4 shrink-0" name="error" />
              <span>{error}</span>
            </div>
          )}

          {/* Nút hành động */}
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
              className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-palette-900 via-palette-800 to-palette-700 px-6 text-xs font-bold text-white shadow-md shadow-palette-900/20 transition hover:opacity-95 active:scale-95 disabled:opacity-50"
              disabled={isSubmitting || otp.trim().length !== 6 || !otpId}
              type="submit"
            >
              {isSubmitting ? (
                <>
                  <span className="size-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  <span>Đang xác thực…</span>
                </>
              ) : (
                <span>Kích hoạt 2FA</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
