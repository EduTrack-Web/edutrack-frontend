import { useState } from 'react'
import type { ChatChannel } from '../models/chat.types'

export function useChatViewModel() {
  const [channels] = useState<ChatChannel[]>([
    { id: 'general', name: 'Thảo luận chung', description: 'Kênh trao đổi học tập chung' },
    { id: 'assignments', name: 'Đồ án & Bài tập lớn', description: 'Kênh tiến độ bài tập và đồ án' },
  ])
  const [isLoading] = useState(false)

  return {
    title: 'Trao đổi nhóm',
    description: 'Thảo luận học tập, trao đổi bài vở và làm việc nhóm theo thời gian thực.',
    assignedMember: 'Thành viên B',
    channels,
    isLoading,
  }
}

