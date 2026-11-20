import { useContext } from 'react'

import type { ChatPresence } from '@/modules/chat/models/chat.types'
import { ChatPresenceContext } from '@/modules/chat/viewmodels/chatPresenceContext'

export const useChatPresence = (fallback: ChatPresence): { presence: ChatPresence; now: number } => {
  const context = useContext(ChatPresenceContext)
  if (!context) throw new Error('useChatPresence must be used inside ChatPresenceProvider')
  return {
    presence: context.presenceByUserId.get(fallback.userId) ?? fallback,
    now: context.now,
  }
}
