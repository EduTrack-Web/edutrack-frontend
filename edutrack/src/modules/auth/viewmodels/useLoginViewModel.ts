import { useState, type FormEvent } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'

import { ApiError } from '@/shared/api/httpClient'
import { useToast } from '@/shared/viewmodels/useToast'
import { validateLogin, validateOtp } from '@/modules/auth/models/authValidation'
import { authApi } from '@/modules/auth/services/authApi'
import { useAuth } from '@/modules/auth/viewmodels/useAuth'

export function useLoginViewModel() {
  const navigate = useNavigate()
  const location = useLocation()
  const { setAuthenticatedUser } = useAuth()
  const { showToast } = useToast()
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [otp, setOtp] = useState('')
  const [otpId, setOtpId] = useState<string>()
  const [otpMode, setOtpMode] = useState<'registration' | 'two-factor'>()
  const [fieldErrors, setFieldErrors] = useState<Readonly<Record<string, string>>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  const returnPath = (() => {
    if (typeof location.state !== 'object' || location.state === null || !('from' in location.state)) return undefined
    const from = (location.state as { from?: unknown }).from
    if (typeof from !== 'object' || from === null) return undefined
    const candidate = from as { pathname?: unknown; search?: unknown; hash?: unknown }
    if (typeof candidate.pathname !== 'string' || !candidate.pathname.startsWith('/')) return undefined
    return `${candidate.pathname}${typeof candidate.search === 'string' ? candidate.search : ''}${typeof candidate.hash === 'string' ? candidate.hash : ''}`
  })()

  const authenticatedPath = (profileCompleted: boolean | undefined): string =>
    profileCompleted === true ? (returnPath ?? '/dashboard') : '/onboarding'

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
          setAuthenticatedUser(result.data.user)
          showToast('Đăng nhập thành công.', 'success')
          navigate(authenticatedPath(result.data.user.profileCompleted))
        }
        return
      }
      const result = await authApi.login(identifier, password)
      if (result.data.requiresVerification && result.data.otpId) { setOtpId(result.data.otpId); setOtpMode('registration'); showToast(result.message ?? 'Vui lòng xác minh email.', 'info'); return }
      if (result.data.requiresTwoFactor && result.data.otpId) { setOtpId(result.data.otpId); setOtpMode('two-factor'); showToast(result.message ?? 'Vui lòng nhập OTP.', 'info'); return }
      if (result.data.user) {
        setAuthenticatedUser(result.data.user)
        showToast('Đăng nhập thành công.', 'success')
        navigate(authenticatedPath(result.data.user.profileCompleted))
      }
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
