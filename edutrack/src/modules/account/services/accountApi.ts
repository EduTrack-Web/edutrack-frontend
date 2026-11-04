import { API_BASE_URL, request } from '../../../shared/api/httpClient'
import type {
  ChangePasswordApiResponse,
  ChangePasswordPayload,
  CheckUsernameApiResponse,
  DeleteAccountPayload,
  Disable2faPayload,
  Enable2faPayload,
  ProfileSetupApiResponse,
  ProfileSetupPayload,
  RevokeSessionsApiResponse,
  Send2faOtpApiResponse,
  SessionsApiResponse,
  SimpleApiResponse,
  UpdateProfileApiResponse,
  UpdateProfilePayload,
  UploadAvatarApiResponse,
  UserProfile,
} from '../models/account.types'

export const accountApi = {
  getProfile: async (): Promise<{ success: true; data: { user: UserProfile } }> => {
    return request('/account/profile', { method: 'GET' })
  },

  updateProfile: async (payload: UpdateProfilePayload): Promise<UpdateProfileApiResponse> => {
    return request('/account/profile', {
      method: 'PATCH',
      body: JSON.stringify(payload),
    })
  },

  uploadAvatar: async (file: File): Promise<UploadAvatarApiResponse> => {
    const formData = new FormData()
    formData.append('avatar', file)

    return request('/account/avatar', {
      method: 'POST',
      body: formData,
    })
  },

  // Onboarding Profile Setup
  checkUsername: async (username: string): Promise<CheckUsernameApiResponse> => {
    return request(`/account/check-username?username=${encodeURIComponent(username)}`, {
      method: 'GET',
    })
  },

  setupProfile: async (payload: ProfileSetupPayload): Promise<ProfileSetupApiResponse> => {
    return request('/account/profile-setup', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  },

  changePassword: async (payload: ChangePasswordPayload): Promise<ChangePasswordApiResponse> => {
    return request('/account/change-password', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  },

  getSessions: async (): Promise<SessionsApiResponse> => {
    return request('/account/sessions', { method: 'GET' })
  },

  revokeOtherSessions: async (): Promise<RevokeSessionsApiResponse> => {
    return request('/account/sessions/revoke-others', {
      method: 'POST',
    })
  },

  // Xác thực 2 bước (2FA)
  send2faOtp: async (): Promise<Send2faOtpApiResponse> => {
    return request('/account/2fa/send-otp', {
      method: 'POST',
    })
  },

  enable2fa: async (payload: Enable2faPayload): Promise<SimpleApiResponse> => {
    return request('/account/2fa/enable', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  },

  disable2fa: async (payload: Disable2faPayload): Promise<SimpleApiResponse> => {
    return request('/account/2fa/disable', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  },

  // Liên kết tài khoản Google
  getGoogleLinkUrl: (): string => {
    return `${API_BASE_URL}/auth/google?action=link`
  },

  unlinkGoogle: async (): Promise<SimpleApiResponse> => {
    return request('/account/google/unlink', {
      method: 'POST',
    })
  },

  // Xóa tài khoản vĩnh viễn (Danger Zone)
  sendDeleteAccountOtp: async (): Promise<Send2faOtpApiResponse> => {
    return request('/account/delete/send-otp', {
      method: 'POST',
    })
  },

  deleteAccount: async (payload: DeleteAccountPayload): Promise<SimpleApiResponse> => {
    return request('/account', {
      method: 'DELETE',
      body: JSON.stringify(payload),
    })
  },
}
