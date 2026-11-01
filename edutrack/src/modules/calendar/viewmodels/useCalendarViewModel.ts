import { useState } from 'react'
import type { CalendarEvent } from '../models/calendar.types'

export function useCalendarViewModel() {
  const [events] = useState<CalendarEvent[]>([])
  const [isLoading] = useState(false)

  return {
    title: 'Lịch trình học tập',
    description: 'Quản lý thời khóa biểu, lịch thi, deadline và nhắc nhở học tập trong một giao diện trực quan.',
    assignedMember: 'Thành viên A',
    events,
    isLoading,
  }
}

