import { API_BASE_URL, request } from '@/shared/api/httpClient'
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
} from '@/modules/account/models/account.types'

export const accountApi = {
  getProfile: async (): Promise<{ success: true; data: { user: UserProfile } }> => {
    return request('/users/me', { method: 'GET' })
  },

  updateProfile: async (payload: UpdateProfilePayload): Promise<UpdateProfileApiResponse> => {
    return request('/users/me', {
      method: 'PATCH',
      body: JSON.stringify(payload),
    })
  },

  uploadAvatar: async (file: File): Promise<UploadAvatarApiResponse> => {
    const formData = new FormData()
    formData.append('avatar', file)

    return request('/users/me/avatar', {
      method: 'PUT',
      body: formData,
    })
  },

  // Onboarding Profile Setup
  checkUsername: async (username: string): Promise<CheckUsernameApiResponse> => {
    return request(`/users/username-availability?username=${encodeURIComponent(username)}`, {
      method: 'GET',
    })
  },

  setupProfile: async (payload: ProfileSetupPayload): Promise<ProfileSetupApiResponse> => {
    return request('/users/me/profile-completion', {
      method: 'PATCH',
      body: JSON.stringify(payload),
    })
  },

  changePassword: async (payload: ChangePasswordPayload): Promise<ChangePasswordApiResponse> => {
    return request('/users/me/password', {
      method: 'PUT',
      body: JSON.stringify(payload),
    })
  },

  getSessions: async (): Promise<SessionsApiResponse> => {
    return request('/users/me/sessions', { method: 'GET' })
  },

  revokeOtherSessions: async (): Promise<RevokeSessionsApiResponse> => {
    return request('/users/me/sessions', {
      method: 'DELETE',
    })
  },

  // Xác thực 2 bước (2FA)
  send2faOtp: async (): Promise<Send2faOtpApiResponse> => {
    return request('/users/me/two-factor-challenges', {
      method: 'POST',
    })
  },

  enable2fa: async (payload: Enable2faPayload): Promise<SimpleApiResponse> => {
    return request('/users/me/two-factor-authentication', {
      method: 'PUT',
      body: JSON.stringify(payload),
    })
  },

  disable2fa: async (payload: Disable2faPayload): Promise<SimpleApiResponse> => {
    return request('/users/me/two-factor-authentication', {
      method: 'DELETE',
      body: JSON.stringify(payload),
    })
  },

  // Liên kết tài khoản Google
  getGoogleLinkUrl: (): string => {
    return `${API_BASE_URL}/auth/google/authorizations?action=link`
  },

  unlinkGoogle: async (): Promise<SimpleApiResponse> => {
    return request('/users/me/google-link', {
      method: 'DELETE',
    })
  },

  // Xóa tài khoản vĩnh viễn (Danger Zone)
  sendDeleteAccountOtp: async (): Promise<Send2faOtpApiResponse> => {
    return request('/users/me/deletion-verifications', {
      method: 'POST',
    })
  },

  deleteAccount: async (payload: DeleteAccountPayload): Promise<SimpleApiResponse> => {
    return request('/users/me', {
      method: 'DELETE',
      body: JSON.stringify(payload),
    })
  },
}
