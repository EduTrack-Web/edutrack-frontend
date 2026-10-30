import { useEffect, useState } from 'react'

import { ApiError } from '../../../shared/api/httpClient'
import { useToast } from '../../../shared/viewmodels/useToast'
import { authApi } from '../services/authApi'

interface OtpResendButtonProps {
  otpId: string
  purpose: 'registration' | 'password-reset' | 'login-2fa'
  onResent: (otpId: string) => void
}

export function OtpResendButton({ otpId, purpose, onResent }: OtpResendButtonProps) {
  const { showToast } = useToast()
  const [seconds, setSeconds] = useState(10)
  const [loading, setLoading] = useState(false)
  useEffect(() => {
    if (seconds <= 0) return
    const timer = window.setTimeout(() => setSeconds((value) => value - 1), 1000)
    return () => window.clearTimeout(timer)
  }, [seconds])

  const resend = async () => {
    setLoading(true)
    try {
      const result = await authApi.resendOtp(otpId, purpose)
      onResent(result.data.otpId); setSeconds(10); showToast(result.message ?? 'Mã OTP mới đã được gửi.', 'info')
    } catch (error) {
      showToast(error instanceof ApiError ? error.message : 'Không thể gửi lại OTP.', 'error')
    } finally { setLoading(false) }
  }

  return <div className="text-center text-xs text-slate-500 dark:text-slate-400"><button className="font-bold text-palette-700 disabled:text-slate-400 dark:text-palette-200" disabled={seconds > 0 || loading} type="button" onClick={() => void resend()}>{loading ? 'Đang gửi…' : seconds > 0 ? `Gửi lại sau ${seconds}s` : 'Gửi lại mã OTP'}</button></div>
}
