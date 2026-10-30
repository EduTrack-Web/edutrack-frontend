import { useState, type FormEvent } from 'react'

import { ApiError } from '../../../shared/api/httpClient'
import { useToast } from '../../../shared/viewmodels/useToast'
import { validateEmail, validatePasswordReset } from '../models/authValidation'
import { authApi } from '../services/authApi'

export function useForgotPasswordViewModel() {
  const { showToast } = useToast()
  const [email, setEmail] = useState('')
  const [otpId, setOtpId] = useState<string>()
  const [code, setCode] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [fieldErrors, setFieldErrors] = useState<Readonly<Record<string, string>>>({})
  const [message, setMessage] = useState<string>()
  const [complete, setComplete] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    const validationErrors = otpId ? validatePasswordReset(code, newPassword, confirmPassword) : validateEmail(email)
    setFieldErrors(validationErrors)
    if (Object.keys(validationErrors).length > 0) return
    setIsSubmitting(true); setMessage(undefined)
    try {
      if (!otpId) {
        const result = await authApi.forgotPassword(email)
        if (result.data.otpId) setOtpId(result.data.otpId)
        showToast(result.message ?? 'Mã OTP đã được gửi.', 'info')
      } else {
        const result = await authApi.resetPassword({ otpId, code, newPassword, confirmPassword })
        setComplete(true); setMessage(result.message); showToast(result.message ?? 'Đặt lại mật khẩu thành công.', 'success')
      }
    } catch (error) {
      if (error instanceof ApiError) { const errors = error.fieldErrors ?? {}; setFieldErrors(errors); if (Object.keys(errors).length === 0) showToast(error.message, 'error') } else showToast('Không thể kết nối hệ thống. Vui lòng thử lại.', 'error')
    } finally { setIsSubmitting(false) }
  }
  const clearFieldError = (field: string) => setFieldErrors((current) => {
    const remaining: Record<string, string> = { ...current }
    delete remaining[field]
    return remaining
  })
  const updateEmail = (value: string) => { setEmail(value); clearFieldError('email') }
  const updateCode = (value: string) => { setCode(value); clearFieldError('otp') }
  const updateNewPassword = (value: string) => { setNewPassword(value); clearFieldError('newPassword') }
  const updateConfirmPassword = (value: string) => { setConfirmPassword(value); clearFieldError('confirmPassword') }
  return { email, otpId, code, newPassword, confirmPassword, fieldErrors, message, complete, isSubmitting, setEmail: updateEmail, setOtpId, setCode: updateCode, setNewPassword: updateNewPassword, setConfirmPassword: updateConfirmPassword, submit }
}
