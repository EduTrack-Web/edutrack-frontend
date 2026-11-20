import { createContext } from 'react'

import type { ChatPresence } from '@/modules/chat/models/chat.types'

export interface ChatPresenceContextValue {
  presenceByUserId: ReadonlyMap<string, ChatPresence>
  now: number
}

export const ChatPresenceContext = createContext<ChatPresenceContextValue | null>(null)
