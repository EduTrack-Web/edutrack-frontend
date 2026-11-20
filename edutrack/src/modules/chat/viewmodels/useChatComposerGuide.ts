import { useState } from 'react'

import {
  hasSeenChatComposerGuide,
  markChatComposerGuideSeen,
} from '@/modules/chat/services/chatOnboardingStorage'

export const useChatComposerGuide = (userId: string) => {
  const [isVisible, setIsVisible] = useState(() =>
    Boolean(userId) && !hasSeenChatComposerGuide(userId))

  const dismiss = () => {
    markChatComposerGuideSeen(userId)
    setIsVisible(false)
  }

  return { isVisible, dismiss }
}
