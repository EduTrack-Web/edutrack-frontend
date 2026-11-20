import { useEffect, useMemo, useState, type PropsWithChildren } from 'react'

import type { ChatPresence } from '@/modules/chat/models/chat.types'
import { createChatSocket } from '@/modules/chat/services/chatSocket'
import { ChatPresenceContext } from '@/modules/chat/viewmodels/chatPresenceContext'

export function ChatPresenceProvider({ children }: PropsWithChildren) {
  const [presenceByUserId, setPresenceByUserId] = useState<ReadonlyMap<string, ChatPresence>>(() => new Map())
  const [now, setNow] = useState(Date.now)

  useEffect(() => {
    const socket = createChatSocket()
    const handlePresence = (presence: ChatPresence) => {
      setPresenceByUserId((current) => {
        const next = new Map(current)
        next.set(presence.userId, presence)
        return next
      })
    }
    socket.on('chat:presence-changed', handlePresence)
    socket.connect()
    return () => {
      socket.off('chat:presence-changed', handlePresence)
      socket.disconnect()
    }
  }, [])

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 30_000)
    return () => window.clearInterval(timer)
  }, [])

  const value = useMemo(() => ({ presenceByUserId, now }), [now, presenceByUserId])
  return <ChatPresenceContext.Provider value={value}>{children}</ChatPresenceContext.Provider>
}
