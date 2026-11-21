import { API_BASE_URL, request } from '@/shared/api/httpClient'
import type { ApiSuccess, AuthUser } from '@/modules/auth/models/AuthUser'

export interface LoginResult {
  user?: AuthUser
  requiresVerification?: true
  requiresTwoFactor?: true
  otpId?: string
}

export const authApi = {
  login: (identifier: string, password: string) =>
    request<ApiSuccess<LoginResult>>('/auth/sessions', { method: 'POST', body: JSON.stringify({ identifier, password }) }),

  register: (payload: { fullName: string; email: string; password: string; confirmPassword: string }) =>
    request<ApiSuccess<{ user: AuthUser; otpId: string }>>('/auth/registrations', { method: 'POST', body: JSON.stringify(payload) }),

  verifyRegistration: (otpId: string, code: string) =>
    request<ApiSuccess<{ user: AuthUser }>>('/auth/registration-verifications', { method: 'POST', body: JSON.stringify({ otpId, code }) }),

  verifyTwoFactor: (otpId: string, code: string) =>
    request<ApiSuccess<{ user: AuthUser }>>('/auth/two-factor-verifications', { method: 'POST', body: JSON.stringify({ otpId, code }) }),

  forgotPassword: (email: string) =>
    request<ApiSuccess<{ accepted: true; otpId?: string }>>('/auth/password-reset-requests', { method: 'POST', body: JSON.stringify({ email }) }),

  resendOtp: (otpId: string, purpose: 'registration' | 'password-reset' | 'login-2fa') =>
    request<ApiSuccess<{ otpId: string }>>('/auth/otp-resend-requests', { method: 'POST', body: JSON.stringify({ otpId, purpose }) }),

  resetPassword: (payload: { otpId: string; code: string; newPassword: string; confirmPassword: string }) =>
    request<ApiSuccess<never>>('/auth/password-resets', { method: 'POST', body: JSON.stringify(payload) }),

  me: () => request<ApiSuccess<{ user: AuthUser }>>('/auth/sessions/current'),

  refresh: () => request<ApiSuccess<{ user: AuthUser }>>('/auth/sessions/current', { method: 'PATCH' }),

  logout: () => request<ApiSuccess<never>>('/auth/sessions/current', { method: 'DELETE' }),

  googleLoginUrl: `${API_BASE_URL}/auth/google/authorizations`,
}
