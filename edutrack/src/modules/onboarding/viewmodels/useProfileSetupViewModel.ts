import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { ApiError } from '@/shared/api/httpClient'
import { useToast } from '@/shared/viewmodels/useToast'
import type { UserType } from '@/modules/auth/models/AuthUser'
import { useAuth } from '@/modules/auth/viewmodels/useAuth'
import type { ProfileSetupPayload } from '@/modules/account/models/account.types'
import { validateUsernameFormat } from '@/modules/account/models/accountValidation'
import { accountApi } from '@/modules/account/services/accountApi'


export type SetupStep = 1 | 2 | 3 | 4

export const USER_ROLES: { type: UserType; title: string; subtitle: string; icon: string }[] = [
  {
    type: 'student',
    title: 'Sinh viên',
    subtitle: 'Đại học, Cao đẳng — Quản lý tín chỉ, thời khóa biểu, thi cử và đồ án.',
    icon: '🎓',
  },
  {
    type: 'pupil',
    title: 'Học sinh',
    subtitle: 'THCS, THPT — Theo dõi thời khóa biểu lớp, bài tập về nhà và ôn thi.',
    icon: '🎒',
  },
  {
    type: 'worker',
    title: 'Người đi làm',
    subtitle: 'Chuyên viên, Công sở — Lịch làm việc, khóa học kỹ năng, chứng chỉ và dự án.',
    icon: '💼',
  },
  {
    type: 'teacher',
    title: 'Giảng viên / Giáo viên',
    subtitle: 'Tổ chức lịch giảng dạy, theo dõi nhóm sinh viên và nghiên cứu học thuật.',
    icon: '👨‍🏫',
  },
  {
    type: 'other',
    title: 'Tự do / Tự học & Tìm việc',
    subtitle: 'Học tập độc lập, luyện thi chứng chỉ, chuyển nghề hoặc tìm kiếm việc làm.',
    icon: '📖',
  },
]

export function useProfileSetupViewModel() {
  const { user, setAuthenticatedUser, logout } = useAuth()
  const { showToast } = useToast()
  const navigate = useNavigate()

  const [step, setStep] = useState<SetupStep>(1)
  const [userType, setUserType] = useState<UserType>(() => user?.userType || 'student')
  const [username, setUsername] = useState(() => user?.username || '')
  const [usernameError, setUsernameError] = useState<string | null>(null)
  const [isCheckingUsername, setIsCheckingUsername] = useState(false)
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null)

  const [organization, setOrganization] = useState(() => user?.organization || '')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [generalError, setGeneralError] = useState<string | null>(null)

  // Đồng bộ ban đầu nếu user load trễ hơn render lần đầu
  const [prevUser, setPrevUser] = useState(user)
  if (user && user !== prevUser) {
    setPrevUser(user)
    if (!username && user.username) {
      setUsername(user.username)
    }
    if (user.userType) {
      setUserType(user.userType)
    }
    if (!organization && user.organization) {
      setOrganization(user.organization)
    }
  }

  // Kiểm tra tính hợp lệ và khả dụng của username khi người dùng chỉnh sửa
  const handleCheckUsername = async (candidate: string) => {
    const raw = candidate.trim()
    setUsernameError(null)
    setUsernameAvailable(null)

    const formatError = validateUsernameFormat(candidate)
    if (formatError) {
      setUsernameError(formatError)
      return false
    }

    const clean = raw.toLowerCase()

    // Nếu trùng với username hiện tại của chính user
    if (user && clean === user.username.toLowerCase()) {
      setUsernameAvailable(true)
      return true
    }

    setIsCheckingUsername(true)
    try {
      const res = await accountApi.checkUsername(clean)
      if (res.data.available) {
        setUsernameAvailable(true)
        return true
      } else {
        setUsernameAvailable(false)
        setUsernameError(res.data.message || 'Tên đăng nhập này đã có người sử dụng.')
        return false
      }
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Không thể kiểm tra tên đăng nhập lúc này.'
      setUsernameError(msg)
      return false
    } finally {
      setIsCheckingUsername(false)
    }
  }

  // Chuyển sang bước tiếp theo
  const handleNext = async () => {
    setGeneralError(null)

    if (step === 1) {
      setStep(2)
      return
    }

    if (step === 2) {
      const raw = username.trim()
      const isOk = await handleCheckUsername(raw)
      if (!isOk) return
      setUsername(raw.toLowerCase())
      setStep(3)
      return
    }

    if (step === 3) {
      setStep(4)
      return
    }

    if (step === 4) {
      await handleComplete()
    }
  }

  // Quay lại bước trước
  const handleBack = () => {
    setGeneralError(null)
    if (step > 1) {
      setStep((prev) => (prev - 1) as SetupStep)
    }
  }

  // Bỏ qua một bước cụ thể
  const handleSkip = () => {
    setGeneralError(null)
    if (step === 1) {
      setUserType('student')
      setStep(2)
    } else if (step === 2) {
      if (user?.username) setUsername(user.username)
      setUsernameError(null)
      setUsernameAvailable(null)
      setStep(3)
    } else if (step === 3) {
      setOrganization('')
      setStep(4)
    }
  }

  // Hoàn tất lưu toàn bộ thông tin
  const handleComplete = async () => {
    setIsSubmitting(true)
    setGeneralError(null)

    const payload: ProfileSetupPayload = {
      userType,
      username: username.trim().toLowerCase() || user?.username,
      organization: organization.trim() || undefined,
    }

    try {
      const res = await accountApi.setupProfile(payload)
      setAuthenticatedUser(res.data.user)
      showToast('Hồ sơ của bạn đã được thiết lập thành công. Chào mừng bạn đến với EduTrack!', 'success')
      navigate('/dashboard', { replace: true })
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        await logout()
        showToast('Phiên làm việc đã hết hạn. Vui lòng đăng nhập lại.', 'warning')
        navigate('/login', { replace: true })
        return
      }
      const msg = err instanceof ApiError ? err.message : 'Không thể lưu hồ sơ lúc này. Vui lòng thử lại.'
      setGeneralError(msg)
      showToast(msg, 'error')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Bỏ qua toàn bộ và vào thẳng Dashboard
  const handleSkipAll = async () => {
    setIsSubmitting(true)
    setGeneralError(null)
    try {
      const res = await accountApi.setupProfile({})
      setAuthenticatedUser(res.data.user)
      showToast('Bạn có thể cập nhật hồ sơ cá nhân bất cứ lúc nào trong trang Cài đặt.', 'info')
      navigate('/dashboard', { replace: true })
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        await logout()
        showToast('Phiên làm việc đã hết hạn. Vui lòng đăng nhập lại.', 'warning')
        navigate('/login', { replace: true })
        return
      }
      const msg = err instanceof ApiError ? err.message : 'Không thể bỏ qua lúc này. Vui lòng thử lại.'
      setGeneralError(msg)
      showToast(msg, 'error')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Hủy tiến trình thiết lập và đăng xuất quay về trang đăng nhập
  const handleCancelAndLogout = async () => {
    try {
      await logout()
    } finally {
      showToast('Đã hủy thiết lập hồ sơ và quay về trang đăng nhập.', 'info')
      navigate('/login', { replace: true })
    }
  }

  return {
    step,
    userType,
    username,
    usernameError,
    isCheckingUsername,
    usernameAvailable,
    organization,
    isSubmitting,
    generalError,
    user,
    // Actions
    setUserType,
    setUsername: (val: string) => {
      setUsername(val)
      setUsernameError(null)
      setUsernameAvailable(null)
    },
    setOrganization,
    setStep,
    handleCheckUsername,
    handleNext,
    handleBack,
    handleSkip,
    handleComplete,
    handleSkipAll,
    handleCancelAndLogout,
  }
}
