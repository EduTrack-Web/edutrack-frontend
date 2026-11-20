import { io, type Socket } from 'socket.io-client'

import { API_ORIGIN } from '@/shared/api/httpClient'
import type { ChatMessage, ChatPresence, DirectChatMessage } from '@/modules/chat/models/chat.types'

interface SocketAcknowledgement {
  success: boolean
  code?: string
  message?: string
}

interface ServerToClientEvents {
  'chat:message-created': (message: ChatMessage) => void
  'chat:direct-message-created': (message: DirectChatMessage) => void
  'chat:presence-changed': (presence: ChatPresence) => void
}

interface ClientToServerEvents {
  'chat:join-group': (
    payload: { groupId: string },
    acknowledge?: (result: SocketAcknowledgement) => void,
  ) => void
  'chat:leave-group': (payload: { groupId: string }) => void
  'chat:join-direct-conversation': (
    payload: { conversationId: string },
    acknowledge?: (result: SocketAcknowledgement) => void,
  ) => void
  'chat:leave-direct-conversation': (payload: { conversationId: string }) => void
}

export type ChatSocket = Socket<ServerToClientEvents, ClientToServerEvents>

export const createChatSocket = (): ChatSocket => io(
  API_ORIGIN || window.location.origin,
  {
    path: '/v1/api/socket.io',
    withCredentials: true,
    autoConnect: false,
  },
)
