import type { AuthUser, UserType } from '../../auth/models/AuthUser'

export interface UpdateProfilePayload {
  fullName?: string
  username?: string
  phone?: string
  avatarUrl?: string
  userType?: UserType
  organization?: string
  fieldOfStudy?: string
}

export interface ProfileSetupPayload {
  userType?: UserType
  username?: string
  organization?: string
  fieldOfStudy?: string
}

export interface CheckUsernameApiResponse {
  success: true
  data: {
    available: boolean
    message?: string
  }
}

export interface ProfileSetupApiResponse {
  success: true
  data: { user: AuthUser }
  message?: string
}

export interface UserProfile extends AuthUser {
  lastUsernameChangedAt?: string | null
  canChangeUsername?: boolean
  daysUntilNextUsernameChange?: number
  hasPassword?: boolean
  isGoogleLinked?: boolean
}

export interface UpdateProfileApiResponse {
  success: true
  data: { user: AuthUser }
  message?: string
}

export interface UploadAvatarApiResponse {
  success: true
  data: { avatarUrl: string }
  message?: string
}

export interface ChangePasswordPayload {
  currentPassword?: string
  newPassword: string
  confirmPassword: string
  logoutOtherDevices?: boolean
}

export interface ChangePasswordApiResponse {
  success: true
  message: string
}

export interface SessionItem {
  id: string
  userAgent?: string
  ipAddress?: string
  lastUsedAt: string
  createdAt: string
  isCurrent?: boolean
}

export interface SessionsApiResponse {
  success: true
  data: { sessions: SessionItem[] }
}

export interface RevokeSessionsApiResponse {
  success: true
  message: string
}

export interface Send2faOtpApiResponse {
  success: true
  data: { otpId: string }
  message: string
}

export interface Enable2faPayload {
  otpId: string
  code: string
  otp?: string
}

export interface Disable2faPayload {
  password?: string
  otpId?: string
  code?: string
  otp?: string
}

export interface DeleteAccountPayload {
  password?: string
  otpId?: string
  code?: string
  otp?: string
}

export interface SimpleApiResponse {
  success: true
  message: string
}
