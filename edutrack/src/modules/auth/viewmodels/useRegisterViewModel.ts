import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'

import { ApiError } from '../../../shared/api/httpClient'
import { useToast } from '../../../shared/viewmodels/useToast'
import { validateOtp, validateRegistration } from '../models/authValidation'
import { authApi } from '../services/authApi'

export function useRegisterViewModel() {
  const navigate = useNavigate()
  const { showToast } = useToast()
  const [form, setForm] = useState({ fullName: '', email: '', password: '', confirmPassword: '' })
  const [otp, setOtp] = useState('')
  const [otpId, setOtpId] = useState<string>()
  const [fieldErrors, setFieldErrors] = useState<Readonly<Record<string, string>>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const update = (field: keyof typeof form, value: string) => {
    setForm((current) => ({ ...current, [field]: value }))
    setFieldErrors((current) => {
      const remaining: Record<string, string> = { ...current }
      delete remaining[field]
      return remaining
    })
  }

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    const validationErrors = otpId ? validateOtp(otp) : validateRegistration(form)
    setFieldErrors(validationErrors)
    if (Object.keys(validationErrors).length > 0) return
    setIsSubmitting(true)
    try {
      if (otpId) {
        await authApi.verifyRegistration(otpId, otp)
        showToast('Tạo tài khoản thành công. Bạn có thể đăng nhập ngay.', 'success')
        navigate('/login', { replace: true })
        return
      }
      const result = await authApi.register(form)
      setOtpId(result.data.otpId); showToast(result.message ?? 'Mã OTP đã được gửi.', 'info')
    } catch (error) {
      if (error instanceof ApiError) { const errors = error.fieldErrors ?? {}; setFieldErrors(errors); if (Object.keys(errors).length === 0) showToast(error.message, 'error') } else showToast('Không thể kết nối hệ thống. Vui lòng thử lại.', 'error')
    } finally { setIsSubmitting(false) }
  }
  const updateOtp = (value: string) => { setOtp(value); setFieldErrors({}) }
  return { form, otp, otpId, fieldErrors, isSubmitting, update, setOtp: updateOtp, setOtpId, submit }
}
