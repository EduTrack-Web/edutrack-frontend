export interface ChatChannel {
  id: string
  name: string
  description?: string
  isPrivate?: boolean
}

export interface ChatMessage {
  id: string
  groupId: string
  clientMessageId: string
  content: string
  sender: ChatUserSummary
  createdAt: string
}

export interface ChatMessagePage {
  messages: ChatMessage[]
  nextCursor: string | null
}

export interface ChatUserSummary {
  id: string
  fullName: string
  username: string
  avatarUrl?: string
}

export type FriendshipSearchRelation = 'none' | 'friend' | 'incoming' | 'outgoing'

export interface FriendSearchResult extends ChatUserSummary {
  relation: FriendshipSearchRelation
  exactMatch: boolean
}

export interface FriendRequestItem {
  id: string
  direction: 'incoming' | 'outgoing'
  user: ChatUserSummary
  createdAt: string
}

export interface BlockedUserItem extends ChatUserSummary {
  blockedAt: string
}

export interface ChatConversationLastMessage {
  id: string
  content: string
  sender: ChatUserSummary
  isOwn: boolean
  createdAt: string
}

export interface DirectConversationSummary {
  id: string
  participant: ChatUserSummary & {
    isOnline: boolean
    lastActiveAt?: string
  }
  lastMessage?: ChatConversationLastMessage
  createdAt: string
  updatedAt: string
}

export interface ChatPresence {
  userId: string
  isOnline: boolean
  lastActiveAt?: string
}

export interface DirectChatMessage {
  id: string
  conversationId: string
  clientMessageId: string
  content: string
  sender: ChatUserSummary
  createdAt: string
}

export interface DirectChatMessagePage {
  messages: DirectChatMessage[]
  nextCursor: string | null
}

export type ChatSearchConversationType = 'direct' | 'group'

export interface ChatMessageSearchResult {
  messageId: string
  conversationId: string
  conversationType: ChatSearchConversationType
  conversationName: string
  content: string
  sender: ChatUserSummary
  createdAt: string
}

export type ChatFriendsTab = 'friends' | 'requests' | 'sent' | 'blocked'

export type ChatGroupRole = 'owner' | 'manager' | 'member'
export type ChatGroupHistoryVisibility = 'from_join' | 'all'

export interface ChatGroupSummary {
  id: string
  name: string
  description: string
  role: ChatGroupRole
  memberCount: number
  pendingInvitationCount: number
  historyVisibility: ChatGroupHistoryVisibility
  inviteLinksEnabled: boolean
  lastMessage?: ChatConversationLastMessage
  createdAt: string
  updatedAt: string
}

export interface ChatGroupMemberItem {
  role: ChatGroupRole
  joinedAt: string
  user: ChatUserSummary
}

export interface ChatGroupInvitationItem {
  id: string
  createdAt: string
  user: ChatUserSummary
}

export interface ChatGroupDetail extends ChatGroupSummary {
  members: ChatGroupMemberItem[]
  invitations: ChatGroupInvitationItem[]
  canManageInvites: boolean
}

export interface ChatGroupInviteResult {
  url: string
  expiresAt: string
}

export interface ChatGroupInvitePreview {
  group: Pick<ChatGroupSummary, 'id' | 'name' | 'description' | 'memberCount' | 'historyVisibility'>
  alreadyMember: boolean
  invitedDirectly: boolean
}

export interface CreateChatGroupInput {
  name: string
  description: string
  participantIds: string[]
  historyVisibility: ChatGroupHistoryVisibility
}

