import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'

import { ApiError } from '../../../shared/api/httpClient'
import { useToast } from '../../../shared/viewmodels/useToast'
import { validateLogin, validateOtp } from '../models/authValidation'
import { authApi } from '../services/authApi'
import { useAuth } from './useAuth'

export function useLoginViewModel() {
  const navigate = useNavigate()
  const { setAuthenticatedUser } = useAuth()
  const { showToast } = useToast()
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [otp, setOtp] = useState('')
  const [otpId, setOtpId] = useState<string>()
  const [otpMode, setOtpMode] = useState<'registration' | 'two-factor'>()
  const [fieldErrors, setFieldErrors] = useState<Readonly<Record<string, string>>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    const validationErrors = otpMode ? validateOtp(otp) : validateLogin(identifier, password)
    setFieldErrors(validationErrors)
    if (Object.keys(validationErrors).length > 0) return
    setIsSubmitting(true)
    try {
      if (otpMode && otpId) {
        if (otpMode === 'registration') {
          await authApi.verifyRegistration(otpId, otp)
          setOtpMode(undefined); setOtpId(undefined); setOtp(''); showToast('Xác minh thành công. Vui lòng đăng nhập lại.', 'success')
        } else {
          const result = await authApi.verifyTwoFactor(otpId, otp)
          setAuthenticatedUser(result.data.user); showToast('Đăng nhập thành công.', 'success'); navigate('/dashboard')
        }
        return
      }
      const result = await authApi.login(identifier, password)
      if (result.data.requiresVerification && result.data.otpId) { setOtpId(result.data.otpId); setOtpMode('registration'); showToast(result.message ?? 'Vui lòng xác minh email.', 'info'); return }
      if (result.data.requiresTwoFactor && result.data.otpId) { setOtpId(result.data.otpId); setOtpMode('two-factor'); showToast(result.message ?? 'Vui lòng nhập OTP.', 'info'); return }
      if (result.data.user) { setAuthenticatedUser(result.data.user); showToast('Đăng nhập thành công.', 'success'); navigate('/dashboard') }
    } catch (error) {
      if (error instanceof ApiError) {
        const errors = error.fieldErrors ?? {}
        setFieldErrors(errors)
        if (Object.keys(errors).length === 0) showToast(error.message, 'error')
      } else showToast('Không thể kết nối hệ thống. Vui lòng thử lại.', 'error')
    } finally { setIsSubmitting(false) }
  }

  const clearFieldError = (field: string) => setFieldErrors((current) => {
    const remaining: Record<string, string> = { ...current }
    delete remaining[field]
    return remaining
  })
  const updateIdentifier = (value: string) => { setIdentifier(value); clearFieldError('identifier') }
  const updatePassword = (value: string) => { setPassword(value); clearFieldError('password') }
  const updateOtp = (value: string) => { setOtp(value); setFieldErrors({}) }
  return { identifier, password, otp, otpId, otpMode, fieldErrors, isSubmitting, setIdentifier: updateIdentifier, setPassword: updatePassword, setOtp: updateOtp, setOtpId, submit }
}
