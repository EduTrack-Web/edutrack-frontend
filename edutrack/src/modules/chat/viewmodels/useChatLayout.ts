import { useOutletContext } from 'react-router-dom'

import type { useChatViewModel } from '@/modules/chat/viewmodels/useChatViewModel'

export interface ChatLayoutContextValue {
  vm: ReturnType<typeof useChatViewModel>
}

export const useChatLayout = (): ChatLayoutContextValue =>
  useOutletContext<ChatLayoutContextValue>()
