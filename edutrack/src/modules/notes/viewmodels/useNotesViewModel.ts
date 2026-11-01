import { useState } from 'react'
import type { Note } from '../models/notes.types'

export function useNotesViewModel() {
  const [notes] = useState<Note[]>([])
  const [isLoading] = useState(false)

  return {
    title: 'Ghi chú học tập',
    description: 'Soạn thảo, phân loại và kết nối kiến thức theo môn học và dự án.',
    assignedMember: 'Thành viên B',
    notes,
    isLoading,
  }
}

