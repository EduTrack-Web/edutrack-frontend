export interface AuthUser {
  id: string
  fullName: string
  username: string
  email: string
  avatarUrl?: string
  phone?: string
  role: 'user' | 'admin'
  status: 'pending' | 'active' | 'locked'
  emailVerified: boolean
  twoFactorEnabled: boolean
}

export interface ApiSuccess<T> {
  success: true
  data: T
  message?: string
}
