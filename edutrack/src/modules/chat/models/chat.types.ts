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

