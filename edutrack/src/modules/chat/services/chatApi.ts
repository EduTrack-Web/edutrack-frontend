import { request } from '../../../shared/api/httpClient'
import type { ApiSuccess } from '../../auth/models/AuthUser'
import type { ChatChannel, ChatMessage } from '../models/chat.types'

export const chatApi = {
  getChannels: () => request<ApiSuccess<{ channels: ChatChannel[] }>>('/chat/channels'),
  getMessages: (channelId: string) =>
    request<ApiSuccess<{ messages: ChatMessage[] }>>(`/chat/channels/${channelId}/messages`),
}

