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

