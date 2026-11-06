import { useState } from 'react'

import { ApiError } from '../../../shared/api/httpClient'
import { useToast } from '../../../shared/viewmodels/useToast'
import { validateChangePasswordForm } from '../models/accountValidation'
import { accountApi } from '../services/accountApi'


interface UseChangePasswordViewModelOptions {
  hasPassword?: boolean
  onSuccess?: () => void
}

export function useChangePasswordViewModel({
  hasPassword = true,
  onSuccess,
}: UseChangePasswordViewModelOptions = {}) {
  const { showToast } = useToast()

  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [logoutOtherDevices, setLogoutOtherDevices] = useState(true)

  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  const resetForm = () => {
    setCurrentPassword('')
    setNewPassword('')
    setConfirmPassword('')
    setLogoutOtherDevices(true)
    setFieldErrors({})
    setShowCurrentPassword(false)
    setShowNewPassword(false)
    setShowConfirmPassword(false)
  }

  const handleFieldChange = (
    field: 'currentPassword' | 'newPassword' | 'confirmPassword',
    value: string,
  ) => {
    if (field === 'currentPassword') setCurrentPassword(value)
    if (field === 'newPassword') setNewPassword(value)
    if (field === 'confirmPassword') setConfirmPassword(value)

    if (fieldErrors[field]) {
      setFieldErrors((prev) => {
        const next = { ...prev }
        delete next[field]
        return next
      })
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const errors = validateChangePasswordForm(
      { currentPassword, newPassword, confirmPassword },
      hasPassword,
    )

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors)
      showToast('Vui lòng kiểm tra lại thông tin mật khẩu chưa hợp lệ.', 'warning')
      return
    }

    setIsSubmitting(true)
    try {
      const response = await accountApi.changePassword({
        currentPassword: hasPassword ? currentPassword : undefined,
        newPassword,
        confirmPassword,
        logoutOtherDevices,
      })

      showToast(response.message ?? 'Đổi mật khẩu thành công.', 'success')
      resetForm()
      onSuccess?.()
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.fieldErrors) {
          setFieldErrors(err.fieldErrors)
        }
        showToast(err.message, 'error')
      } else {
        showToast('Có lỗi xảy ra khi đổi mật khẩu. Vui lòng thử lại.', 'error')
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return {
    form: {
      currentPassword,
      newPassword,
      confirmPassword,
      logoutOtherDevices,
    },
    visibility: {
      showCurrentPassword,
      showNewPassword,
      showConfirmPassword,
      toggleCurrentPassword: () => setShowCurrentPassword((prev) => !prev),
      toggleNewPassword: () => setShowNewPassword((prev) => !prev),
      toggleConfirmPassword: () => setShowConfirmPassword((prev) => !prev),
    },
    isSubmitting,
    fieldErrors,
    hasPassword,
    setLogoutOtherDevices,
    handleFieldChange,
    handleSubmit,
    resetForm,
  }
}

