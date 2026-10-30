import { API_ORIGIN, request } from '../../../shared/api/httpClient'
import type { ApiSuccess, AuthUser } from '../models/AuthUser'

export interface LoginResult {
  user?: AuthUser
  requiresVerification?: true
  requiresTwoFactor?: true
  otpId?: string
}

export const authApi = {
  login: (identifier: string, password: string) =>
    request<ApiSuccess<LoginResult>>('/auth/login', { method: 'POST', body: JSON.stringify({ identifier, password }) }),

  register: (payload: { fullName: string; email: string; password: string; confirmPassword: string }) =>
    request<ApiSuccess<{ user: AuthUser; otpId: string }>>('/auth/register', { method: 'POST', body: JSON.stringify(payload) }),

  verifyRegistration: (otpId: string, code: string) =>
    request<ApiSuccess<{ user: AuthUser }>>('/auth/verify-registration', { method: 'POST', body: JSON.stringify({ otpId, code }) }),

  verifyTwoFactor: (otpId: string, code: string) =>
    request<ApiSuccess<{ user: AuthUser }>>('/auth/verify-two-factor', { method: 'POST', body: JSON.stringify({ otpId, code }) }),

  forgotPassword: (email: string) =>
    request<ApiSuccess<{ accepted: true; otpId?: string }>>('/auth/forgot-password', { method: 'POST', body: JSON.stringify({ email }) }),

  resendOtp: (otpId: string, purpose: 'registration' | 'password-reset' | 'login-2fa') =>
    request<ApiSuccess<{ otpId: string }>>('/auth/resend-otp', { method: 'POST', body: JSON.stringify({ otpId, purpose }) }),

  resetPassword: (payload: { otpId: string; code: string; newPassword: string; confirmPassword: string }) =>
    request<ApiSuccess<never>>('/auth/reset-password', { method: 'POST', body: JSON.stringify(payload) }),

  me: () => request<ApiSuccess<{ user: AuthUser }>>('/auth/me'),

  refresh: () => request<ApiSuccess<{ user: AuthUser }>>('/auth/refresh', { method: 'POST' }),

  logout: () => request<ApiSuccess<never>>('/auth/logout', { method: 'POST' }),

  googleLoginUrl: `${API_ORIGIN}/v1/api/auth/google`,
}
