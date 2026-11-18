export interface ChatChannel {
  id: string
  name: string
  description?: string
  isPrivate?: boolean
}

export interface ChatMessage {
  id: string
  channelId: string
  senderId: string
  senderName: string
  content: string
  createdAt: string
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

export type ChatFriendsTab = 'friends' | 'requests' | 'blocked'

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

