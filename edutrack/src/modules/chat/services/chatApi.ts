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
  ChatMessagePage,
  ChatMessageSearchResult,
  ChatUserSummary,
  CreateChatGroupInput,
  DirectChatMessage,
  DirectChatMessagePage,
  DirectConversationSummary,
  FriendRequestItem,
  FriendSearchResult,
} from '@/modules/chat/models/chat.types'

export const chatApi = {
  searchMessages: (query: string) =>
    request<ApiSuccess<{ messages: ChatMessageSearchResult[] }>>(
      `/chat/messages?q=${encodeURIComponent(query)}`,
    ),
  getDirectConversations: () =>
    request<ApiSuccess<{ conversations: DirectConversationSummary[] }>>('/chat/direct-conversations'),
  getDirectConversation: (conversationId: string) =>
    request<ApiSuccess<{ conversation: DirectConversationSummary }>>(`/chat/direct-conversations/${conversationId}`),
  getDirectConversationMessages: (conversationId: string, cursor?: string, anchor?: string) =>
    request<ApiSuccess<DirectChatMessagePage>>(
      `/chat/direct-conversations/${conversationId}/messages${cursor
        ? `?cursor=${encodeURIComponent(cursor)}`
        : anchor ? `?anchor=${encodeURIComponent(anchor)}` : ''}`,
    ),
  sendDirectConversationMessage: (conversationId: string, content: string, clientMessageId: string) =>
    request<ApiSuccess<{ message: DirectChatMessage }>>(`/chat/direct-conversations/${conversationId}/messages`, {
      method: 'POST',
      body: JSON.stringify({ content, clientMessageId }),
    }),
  getGroups: () => request<ApiSuccess<{ groups: ChatGroupSummary[] }>>('/chat/groups'),
  createGroup: (input: CreateChatGroupInput) =>
    request<ApiSuccess<{ group: ChatGroupDetail; invite: ChatGroupInviteResult }>>('/chat/groups', {
      method: 'POST',
      body: JSON.stringify(input),
    }),
  getGroup: (groupId: string) =>
    request<ApiSuccess<{ group: ChatGroupDetail }>>(`/chat/groups/${groupId}`),
  createGroupInviteLink: (groupId: string) =>
    request<ApiSuccess<{ invite: ChatGroupInviteResult }>>(`/chat/groups/${groupId}/invite-links`, {
      method: 'POST',
    }),
  previewGroupInvite: (token: string) =>
    request<ApiSuccess<{ invite: ChatGroupInvitePreview }>>(`/chat/group-invitations/${encodeURIComponent(token)}`),
  joinGroupByInvite: (token: string) =>
    request<ApiSuccess<{ group: ChatGroupSummary }>>(`/chat/group-invitations/${encodeURIComponent(token)}/membership`, {
      method: 'POST',
    }),
  getChannels: () => request<ApiSuccess<{ channels: ChatChannel[] }>>('/chat/channels'),
  getGroupMessages: (groupId: string, cursor?: string, anchor?: string) =>
    request<ApiSuccess<ChatMessagePage>>(
      `/chat/groups/${groupId}/messages${cursor
        ? `?cursor=${encodeURIComponent(cursor)}`
        : anchor ? `?anchor=${encodeURIComponent(anchor)}` : ''}`,
    ),
  sendGroupMessage: (groupId: string, content: string, clientMessageId: string) =>
    request<ApiSuccess<{ message: ChatMessage }>>(`/chat/groups/${groupId}/messages`, {
      method: 'POST',
      body: JSON.stringify({ content, clientMessageId }),
    }),
  getFriends: (query = '') =>
    request<ApiSuccess<{ friends: ChatUserSummary[] }>>(`/chat/friendships${query ? `?q=${encodeURIComponent(query)}` : ''}`),
  searchUsers: (query: string) =>
    request<ApiSuccess<{ users: FriendSearchResult[] }>>(`/chat/friend-candidates?q=${encodeURIComponent(query)}`),
  getFriendRequests: () =>
    request<ApiSuccess<{ requests: FriendRequestItem[] }>>('/chat/friend-requests'),
  sendFriendRequest: (identifier: string) =>
    request<ApiSuccess<{ request: FriendRequestItem }>>('/chat/friend-requests', {
      method: 'POST',
      body: JSON.stringify({ identifier }),
    }),
  acceptFriendRequest: (requestId: string) =>
    request<ApiSuccess<{ friend: ChatUserSummary }>>(`/chat/friend-requests/${requestId}/acceptance`, {
      method: 'POST',
    }),
  declineFriendRequest: (requestId: string) =>
    request<ApiSuccess<Record<string, never>>>(`/chat/received-friend-requests/${requestId}`, {
      method: 'DELETE',
    }),
  revokeFriendRequest: (requestId: string) =>
    request<ApiSuccess<Record<string, never>>>(`/chat/sent-friend-requests/${requestId}`, {
      method: 'DELETE',
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

