import { request } from '@/shared/api/httpClient'
import type { ApiSuccess } from '@/modules/auth/models/AuthUser'
import type {
  BlockedUserItem,
  ChatChannel,
  ChatGroupDetail,
  ChatGroupInvitePreview,
  ChatGroupInviteResult,
  ChatGroupSummary,
  ChatMessage,
  ChatUserSummary,
  CreateChatGroupInput,
  FriendRequestItem,
  FriendSearchResult,
} from '@/modules/chat/models/chat.types'

export const chatApi = {
  getGroups: () => request<ApiSuccess<{ groups: ChatGroupSummary[] }>>('/chat/groups'),
  createGroup: (input: CreateChatGroupInput) =>
    request<ApiSuccess<{ group: ChatGroupDetail; invite: ChatGroupInviteResult }>>('/chat/groups', {
      method: 'POST',
      body: JSON.stringify(input),
    }),
  getGroup: (groupId: string) =>
    request<ApiSuccess<{ group: ChatGroupDetail }>>(`/chat/groups/${groupId}`),
  createGroupInviteLink: (groupId: string) =>
    request<ApiSuccess<{ invite: ChatGroupInviteResult }>>(`/chat/groups/${groupId}/invite-link`, {
      method: 'POST',
    }),
  previewGroupInvite: (token: string) =>
    request<ApiSuccess<{ invite: ChatGroupInvitePreview }>>(`/chat/group-invites/${encodeURIComponent(token)}`),
  joinGroupByInvite: (token: string) =>
    request<ApiSuccess<{ group: ChatGroupSummary }>>(`/chat/group-invites/${encodeURIComponent(token)}/join`, {
      method: 'POST',
    }),
  getChannels: () => request<ApiSuccess<{ channels: ChatChannel[] }>>('/chat/channels'),
  getMessages: (channelId: string) =>
    request<ApiSuccess<{ messages: ChatMessage[] }>>(`/chat/channels/${channelId}/messages`),
  getFriends: (query = '') =>
    request<ApiSuccess<{ friends: ChatUserSummary[] }>>(`/chat/friends${query ? `?q=${encodeURIComponent(query)}` : ''}`),
  searchUsers: (query: string) =>
    request<ApiSuccess<{ users: FriendSearchResult[] }>>(`/chat/friends/search?q=${encodeURIComponent(query)}`),
  getFriendRequests: () =>
    request<ApiSuccess<{ requests: FriendRequestItem[] }>>('/chat/friend-requests'),
  sendFriendRequest: (identifier: string) =>
    request<ApiSuccess<{ request: FriendRequestItem }>>('/chat/friend-requests', {
      method: 'POST',
      body: JSON.stringify({ identifier }),
    }),
  acceptFriendRequest: (requestId: string) =>
    request<ApiSuccess<{ friend: ChatUserSummary }>>(`/chat/friend-requests/${requestId}/accept`, {
      method: 'POST',
    }),
  declineFriendRequest: (requestId: string) =>
    request<ApiSuccess<Record<string, never>>>(`/chat/friend-requests/${requestId}/decline`, {
      method: 'POST',
    }),
  getBlockedUsers: () =>
    request<ApiSuccess<{ users: BlockedUserItem[] }>>('/chat/blocked-users'),
  blockUser: (userId: string) =>
    request<ApiSuccess<{ user: BlockedUserItem }>>('/chat/blocked-users', {
      method: 'POST',
      body: JSON.stringify({ userId }),
    }),
  unblockUser: (userId: string) =>
    request<ApiSuccess<Record<string, never>>>(`/chat/blocked-users/${userId}`, {
      method: 'DELETE',
    }),
}

