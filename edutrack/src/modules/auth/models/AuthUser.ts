export type UserType = 'student' | 'pupil' | 'worker' | 'teacher' | 'other'

export interface AuthUser {
  id: string
  fullName: string
  username: string
  email: string
  avatarUrl?: string
  phone?: string
  role: 'user' | 'admin'
  userType?: UserType
  organization?: string
  fieldOfStudy?: string
  profileCompleted?: boolean
  status: 'pending' | 'active' | 'locked'
  emailVerified: boolean
  twoFactorEnabled: boolean
}

export interface ApiSuccess<T> {
  success: true
  data: T
  message?: string
}
