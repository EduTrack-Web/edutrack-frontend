import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'

import { ApiError } from '@/shared/api/httpClient'
import { useToast } from '@/shared/viewmodels/useToast'
import type { UserType } from '@/modules/auth/models/AuthUser'
import { useAuth } from '@/modules/auth/viewmodels/useAuth'
import type { SessionItem, UserProfile } from '@/modules/account/models/account.types'
import { validateProfileForm } from '@/modules/account/models/accountValidation'
import { accountApi } from '@/modules/account/services/accountApi'

const MAX_AVATAR_SIZE = 5 * 1024 * 1024 // 5MB

export interface AccountFeedback {
  type: 'success' | 'info'
  text: string
}

export function useAccountViewModel() {
  const { user, logout, setAuthenticatedUser } = useAuth()
  const { showToast } = useToast()
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()

  const [isEditing, setIsEditing] = useState(false)
  const [profileDetails, setProfileDetails] = useState<UserProfile | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false)
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const [feedbackMessage, setFeedbackMessage] = useState<AccountFeedback | null>(null)

  // Quản lý Modal đổi mật khẩu & đăng xuất
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false)
  const [isConfirmLogoutOpen, setIsConfirmLogoutOpen] = useState(false)

  // Quản lý Modal xóa tài khoản (Danger Zone)
  const [isDeleteAccountOpen, setIsDeleteAccountOpen] = useState(false)
  const [isStartingDeleteAccount, setIsStartingDeleteAccount] = useState(false)
  const [deleteAccountOtpId, setDeleteAccountOtpId] = useState<string | null>(null)

  // Quản lý Modal 2FA
  const [is2faModalOpen, setIs2faModalOpen] = useState(false)
  const [isStarting2fa, setIsStarting2fa] = useState(false)
  const [active2faOtpId, setActive2faOtpId] = useState<string | null>(null)

  const [isDisable2faModalOpen, setIsDisable2faModalOpen] = useState(false)
  const [isStartingDisable2fa, setIsStartingDisable2fa] = useState(false)
  const [disableOtpId, setDisableOtpId] = useState<string | null>(null)

  // Quản lý Modal hủy liên kết Google
  const [isConfirmUnlinkGoogleOpen, setIsConfirmUnlinkGoogleOpen] = useState(false)
  const [isUnlinkingGoogle, setIsUnlinkingGoogle] = useState(false)

  // Quản lý danh sách phiên làm việc
  const [sessions, setSessions] = useState<SessionItem[]>([])
  const [isLoadingSessions, setIsLoadingSessions] = useState(false)
  const [isRevokingSessions, setIsRevokingSessions] = useState(false)

  // Form state
  const [fullName, setFullName] = useState(user?.fullName ?? '')
  const [username, setUsername] = useState(user?.username ?? '')
  const [phone, setPhone] = useState(user?.phone ?? '')
  const [userType, setUserType] = useState<UserType>(user?.userType ?? 'student')
  const [organization, setOrganization] = useState(user?.organization ?? '')
  const [fieldOfStudy, setFieldOfStudy] = useState(user?.fieldOfStudy ?? '')
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  const feedbackTimerRef = useRef<number | null>(null)

  const showFeedback = useCallback((type: 'success' | 'info', text: string) => {
    if (feedbackTimerRef.current) {
      window.clearTimeout(feedbackTimerRef.current)
    }
    setFeedbackMessage({ type, text })
    feedbackTimerRef.current = window.setTimeout(() => {
      setFeedbackMessage(null)
      feedbackTimerRef.current = null
    }, 5000)
  }, [])

  const dismissFeedback = useCallback(() => {
    if (feedbackTimerRef.current) {
      window.clearTimeout(feedbackTimerRef.current)
      feedbackTimerRef.current = null
    }
    setFeedbackMessage(null)
  }, [])

  // Khôi phục form từ thông tin user
  const syncFormFromUser = useCallback(() => {
    if (user) {
      setFullName(user.fullName)
      setUsername(user.username)
      setPhone(user.phone ?? '')
      setUserType(user.userType ?? 'student')
      setOrganization(user.organization ?? '')
      setFieldOfStudy(user.fieldOfStudy ?? '')
      setAvatarPreview(null)
      setAvatarFile(null)
      setFieldErrors({})
    }
  }, [user])

  // Lấy thông tin chi tiết về profile (cooldown đổi username, hasPassword, isGoogleLinked)
  const fetchProfileDetails = useCallback(async () => {
    try {
      const response = await accountApi.getProfile()
      setProfileDetails(response.data.user)
    } catch {
      if (user) {
        setProfileDetails({
          ...user,
          canChangeUsername: true,
          daysUntilNextUsernameChange: 0,
          hasPassword: true,
          isGoogleLinked: false,
        })
      }
    }
  }, [user])

  // Tải danh sách phiên làm việc
  const fetchSessions = useCallback(async () => {
    setIsLoadingSessions(true)
    try {
      const response = await accountApi.getSessions()
      setSessions(response.data.sessions)
    } catch {
      setSessions([])
    } finally {
      setIsLoadingSessions(false)
    }
  }, [])

  // Tải dữ liệu ban đầu khi mount
  useEffect(() => {
    let active = true

    const loadInitialData = async () => {
      try {
        const [profileRes, sessionsRes] = await Promise.all([
          accountApi.getProfile().catch(() => null),
          accountApi.getSessions().catch(() => null),
        ])

        if (!active) return

        if (profileRes) {
          setProfileDetails(profileRes.data.user)
        } else if (user) {
          setProfileDetails({
            ...user,
            canChangeUsername: true,
            daysUntilNextUsernameChange: 0,
            hasPassword: true,
            isGoogleLinked: false,
          })
        }

        if (sessionsRes) {
          setSessions(sessionsRes.data.sessions)
        }
      } finally {
        if (active) {
          setIsLoadingSessions(false)
        }
      }
    }

    void loadInitialData()

    return () => {
      active = false
    }
  }, [user])

  // Xử lý Google OAuth Redirect Callback params (?oauthSuccess=GOOGLE_LINKED hoặc ?oauthError=...)
  useEffect(() => {
    const oauthSuccess = searchParams.get('oauthSuccess')
    const oauthError = searchParams.get('oauthError')

    if (oauthSuccess) {
      if (oauthSuccess === 'GOOGLE_LINKED') {
        showToast('Liên kết tài khoản Google thành công!', 'success')
        window.setTimeout(() => {
          showFeedback('success', 'Đã liên kết thành công với tài khoản Google.')
          void fetchProfileDetails()
        }, 0)
      }
      searchParams.delete('oauthSuccess')
      setSearchParams(searchParams, { replace: true })
    } else if (oauthError) {
      let errorMessage = 'Liên kết Google thất bại.'
      if (oauthError === 'GOOGLE_ALREADY_LINKED') {
        errorMessage = 'Tài khoản Google này đã được liên kết với một tài khoản EduTrack khác.'
      } else if (oauthError === 'GOOGLE_LINK_FAILED') {
        errorMessage = 'Không thể liên kết tài khoản Google. Vui lòng thử lại.'
      } else if (oauthError === 'GOOGLE_AUTH_FAILED') {
        errorMessage = 'Xác thực Google không thành công hoặc phiên liên kết đã hết hạn.'
      }
      showToast(errorMessage, 'error')
      searchParams.delete('oauthError')
      setSearchParams(searchParams, { replace: true })
    }
  }, [searchParams, setSearchParams, showToast, showFeedback, fetchProfileDetails])

  // Kiểm tra xem người dùng có thực hiện thay đổi nào so với dữ liệu gốc không
  const hasChanges = useMemo(() => {
    if (!user) return false
    const nameChanged = fullName.trim() !== user.fullName
    const usernameChanged = username.trim().toLowerCase() !== user.username
    const phoneChanged = phone.trim() !== (user.phone ?? '')
    const userTypeChanged = userType !== (user.userType ?? 'student')
    const orgChanged = organization.trim() !== (user.organization ?? '')
    const fieldChanged = fieldOfStudy.trim() !== (user.fieldOfStudy ?? '')
    const avatarChanged = avatarFile !== null
    return (
      nameChanged ||
      usernameChanged ||
      phoneChanged ||
      userTypeChanged ||
      orgChanged ||
      fieldChanged ||
      avatarChanged
    )
  }, [user, fullName, username, phone, userType, organization, fieldOfStudy, avatarFile])

  // Bắt đầu chỉnh sửa
  const handleStartEdit = () => {
    syncFormFromUser()
    dismissFeedback()
    setIsEditing(true)
  }

  // Hủy chỉnh sửa
  const handleCancelEdit = () => {
    syncFormFromUser()
    setIsEditing(false)
  }

  // Xóa ảnh đại diện preview đã chọn để quay lại ảnh cũ
  const handleResetAvatar = () => {
    setAvatarFile(null)
    setAvatarPreview(null)
  }

  // Xóa lỗi của từng trường khi người dùng gõ
  const handleFieldChange = (
    field: 'fullName' | 'username' | 'phone' | 'userType' | 'organization' | 'fieldOfStudy',
    value: string,
  ) => {
    if (field === 'fullName') setFullName(value)
    if (field === 'username') setUsername(value)
    if (field === 'phone') setPhone(value)
    if (field === 'userType') setUserType(value as UserType)
    if (field === 'organization') setOrganization(value)
    if (field === 'fieldOfStudy') setFieldOfStudy(value)

    if (fieldErrors[field]) {
      setFieldErrors((prev) => {
        const next = { ...prev }
        delete next[field]
        return next
      })
    }
  }

  // Chọn ảnh đại diện mới
  const handleAvatarSelect = (file: File) => {
    if (!['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(file.type)) {
      showToast('Định dạng ảnh không được hỗ trợ. Vui lòng chọn JPG, PNG hoặc WebP.', 'error')
      return
    }

    if (file.size > MAX_AVATAR_SIZE) {
      showToast('Dung lượng ảnh vượt quá 5MB. Vui lòng chọn ảnh nhỏ hơn.', 'error')
      return
    }

    setAvatarFile(file)
    const previewUrl = URL.createObjectURL(file)
    setAvatarPreview(previewUrl)
  }

  // Submit cập nhật thông tin cá nhân
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!hasChanges) {
      showToast('Bạn chưa thực hiện thay đổi nào trên hồ sơ.', 'info')
      setIsEditing(false)
      return
    }

    const errors = validateProfileForm({
      fullName,
      username,
      phone,
      organization,
      fieldOfStudy,
    })

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors)
      showToast('Vui lòng kiểm tra lại các trường thông tin chưa hợp lệ.', 'warning')
      return
    }

    const trimmedName = fullName.trim()
    const trimmedUsername = username.trim().toLowerCase()
    const trimmedPhone = phone.trim()

    setIsSaving(true)
    try {
      let uploadedAvatarUrl = user?.avatarUrl

      if (avatarFile) {
        setIsUploadingAvatar(true)
        try {
          const avatarResult = await accountApi.uploadAvatar(avatarFile)
          uploadedAvatarUrl = avatarResult.data.avatarUrl
        } finally {
          setIsUploadingAvatar(false)
        }
      }

      const updateResult = await accountApi.updateProfile({
        fullName: trimmedName,
        username: trimmedUsername,
        phone: trimmedPhone,
        avatarUrl: uploadedAvatarUrl,
        userType,
        organization: organization.trim() || undefined,
        fieldOfStudy: fieldOfStudy.trim() || undefined,
      })

      const successText = avatarFile
        ? 'Cập nhật ảnh đại diện và thông tin cá nhân thành công!'
        : (updateResult.message ?? 'Cập nhật thông tin cá nhân thành công!')

      setAuthenticatedUser(updateResult.data.user)
      setIsEditing(false)
      showFeedback('success', successText)
      showToast(successText, 'success')
      void fetchProfileDetails()
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.fieldErrors) {
          setFieldErrors(err.fieldErrors)
        }
        showToast(err.message, 'error')
      } else {
        showToast('Có lỗi xảy ra khi lưu thông tin. Vui lòng thử lại.', 'error')
      }
    } finally {
      setIsSaving(false)
    }
  }

  // Đăng xuất các thiết bị khác
  const handleRevokeOtherSessions = async () => {
    setIsRevokingSessions(true)
    try {
      const response = await accountApi.revokeOtherSessions()
      showToast(response.message ?? 'Đã đăng xuất các thiết bị khác thành công.', 'success')
      void fetchSessions()
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : 'Không thể đăng xuất các thiết bị khác lúc này.', 'error')
    } finally {
      setIsRevokingSessions(false)
    }
  }

  // Modal đổi mật khẩu
  const openChangePasswordModal = () => setIsChangePasswordOpen(true)
  const closeChangePasswordModal = () => setIsChangePasswordOpen(false)

  // Modal xác nhận đăng xuất
  const openLogoutModal = () => setIsConfirmLogoutOpen(true)
  const closeLogoutModal = () => setIsConfirmLogoutOpen(false)

  const handleConfirmLogout = async () => {
    setIsLoggingOut(true)
    try {
      await logout()
      closeLogoutModal()
    } catch {
      setIsLoggingOut(false)
      showToast('Không thể đăng xuất lúc này. Vui lòng thử lại.', 'error')
    }
  }

  // Luồng Kích hoạt 2FA: Gửi OTP trước rồi mở modal
  const open2faModal = async () => {
    setIsStarting2fa(true)
    try {
      const response = await accountApi.send2faOtp()
      setActive2faOtpId(response.data.otpId)
      setIs2faModalOpen(true)
      showToast(response.message ?? 'Mã xác thực đã được gửi về email của bạn.', 'info')
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Không thể gửi mã OTP lúc này. Vui lòng thử lại sau.'
      showToast(msg, 'error')
    } finally {
      setIsStarting2fa(false)
    }
  }

  const close2faModal = () => {
    setIs2faModalOpen(false)
    setActive2faOtpId(null)
  }

  const handle2faSuccess = () => {
    if (user) {
      setAuthenticatedUser({ ...user, twoFactorEnabled: true })
    }
    setProfileDetails((prev) => (prev ? { ...prev, twoFactorEnabled: true } : null))
    showFeedback('success', 'Đã bật xác thực 2 bước (2FA) thành công.')
  }

  // Luồng Tắt 2FA: Nếu không có mật khẩu thì gửi OTP trước
  const openDisable2faModal = async () => {
    if (profileDetails && !profileDetails.hasPassword) {
      setIsStartingDisable2fa(true)
      try {
        const response = await accountApi.send2faOtp()
        setDisableOtpId(response.data.otpId)
        setIsDisable2faModalOpen(true)
        showToast(response.message ?? 'Mã xác thực đã được gửi về email của bạn.', 'info')
      } catch (err) {
        const msg = err instanceof ApiError ? err.message : 'Không thể gửi mã OTP lúc này.'
        showToast(msg, 'error')
      } finally {
        setIsStartingDisable2fa(false)
      }
    } else {
      setIsDisable2faModalOpen(true)
    }
  }

  const closeDisable2faModal = () => {
    setIsDisable2faModalOpen(false)
    setDisableOtpId(null)
  }

  const handleDisable2faSuccess = () => {
    if (user) {
      setAuthenticatedUser({ ...user, twoFactorEnabled: false })
    }
    setProfileDetails((prev) => (prev ? { ...prev, twoFactorEnabled: false } : null))
    showFeedback('info', 'Đã tắt xác thực 2 bước (2FA).')
  }

  // Google Account Linking / Unlinking
  const handleStartGoogleLink = () => {
    window.location.href = accountApi.getGoogleLinkUrl()
  }

  const openConfirmUnlinkGoogleModal = () => setIsConfirmUnlinkGoogleOpen(true)
  const closeConfirmUnlinkGoogleModal = () => setIsConfirmUnlinkGoogleOpen(false)

  const handleConfirmUnlinkGoogle = async () => {
    if (profileDetails && !profileDetails.hasPassword) {
      showToast('Bạn cần thiết lập mật khẩu tài khoản trước khi hủy liên kết Google để tránh mất quyền đăng nhập.', 'warning')
      closeConfirmUnlinkGoogleModal()
      return
    }

    setIsUnlinkingGoogle(true)
    try {
      const response = await accountApi.unlinkGoogle()
      setProfileDetails((prev) => (prev ? { ...prev, isGoogleLinked: false } : null))
      showToast(response.message ?? 'Đã hủy liên kết tài khoản Google thành công.', 'success')
      showFeedback('success', 'Đã hủy liên kết tài khoản Google thành công.')
      closeConfirmUnlinkGoogleModal()
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Không thể hủy liên kết Google lúc này.'
      showToast(msg, 'error')
    } finally {
      setIsUnlinkingGoogle(false)
    }
  }

  // Quản lý Xóa tài khoản vĩnh viễn (Danger Zone)
  const openDeleteAccountModal = async () => {
    if (profileDetails && !profileDetails.hasPassword) {
      setIsStartingDeleteAccount(true)
      try {
        const response = await accountApi.sendDeleteAccountOtp()
        setDeleteAccountOtpId(response.data.otpId)
        setIsDeleteAccountOpen(true)
        showToast(response.message ?? 'Mã xác nhận xóa tài khoản đã được gửi về email của bạn.', 'info')
      } catch (err) {
        const msg = err instanceof ApiError ? err.message : 'Không thể gửi mã OTP xác nhận lúc này.'
        showToast(msg, 'error')
      } finally {
        setIsStartingDeleteAccount(false)
      }
    } else {
      setIsDeleteAccountOpen(true)
    }
  }

  const closeDeleteAccountModal = () => {
    setIsDeleteAccountOpen(false)
    setDeleteAccountOtpId(null)
  }

  const handleDeleteAccountSuccess = async (customMessage?: string) => {
    try {
      await logout()
    } finally {
      showToast(customMessage || 'Tài khoản của bạn đã được xóa vĩnh viễn khỏi hệ thống.', 'success')
      navigate('/login', { replace: true })
    }
  }

  return {
    user,
    isEditing,
    profileDetails,
    fetchProfileDetails,
    isSaving,
    isUploadingAvatar,
    isLoggingOut,
    hasChanges,
    feedbackMessage,
    dismissFeedback,
    formData: {
      fullName,
      username,
      phone,
      userType,
      organization,
      fieldOfStudy,
    },
    avatarPreview,
    fieldErrors,
    // Sessions
    sessions,
    isLoadingSessions,
    isRevokingSessions,
    handleRevokeOtherSessions,
    fetchSessions,
    // Modals
    isChangePasswordOpen,
    openChangePasswordModal,
    closeChangePasswordModal,
    isConfirmLogoutOpen,
    openLogoutModal,
    closeLogoutModal,
    handleConfirmLogout,
    // 2FA
    is2faModalOpen,
    isStarting2fa,
    active2faOtpId,
    open2faModal,
    close2faModal,
    handle2faSuccess,
    isDisable2faModalOpen,
    isStartingDisable2fa,
    disableOtpId,
    openDisable2faModal,
    closeDisable2faModal,
    handleDisable2faSuccess,
    // Google Linking
    isConfirmUnlinkGoogleOpen,
    isUnlinkingGoogle,
    openConfirmUnlinkGoogleModal,
    closeConfirmUnlinkGoogleModal,
    handleStartGoogleLink,
    handleConfirmUnlinkGoogle,
    // Delete Account (Danger Zone)
    isDeleteAccountOpen,
    isStartingDeleteAccount,
    deleteAccountOtpId,
    openDeleteAccountModal,
    closeDeleteAccountModal,
    handleDeleteAccountSuccess,
    // Form actions
    handleStartEdit,
    handleCancelEdit,
    handleResetAvatar,
    handleFieldChange,
    handleAvatarSelect,
    handleSubmit,
  }
}
