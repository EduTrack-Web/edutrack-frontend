import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { ApiError } from '../../../shared/api/httpClient'
import { useToast } from '../../../shared/viewmodels/useToast'
import type { NoteSummary } from '../models/notes.types'
import { notesApi } from '../services/notesApi'

export function useNotesViewModel() {
  const navigate = useNavigate()
  const { showToast } = useToast()
  const [notes, setNotes] = useState<NoteSummary[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isCreating, setIsCreating] = useState(false)
  const [loadFailed, setLoadFailed] = useState(false)

  const loadNotes = useCallback(async () => {
    setIsLoading(true)
    setLoadFailed(false)
    try {
      const result = await notesApi.getNotes()
      setNotes(result.data.notes)
    } catch (error) {
      setLoadFailed(true)
      showToast(error instanceof ApiError ? error.message : 'Không thể tải danh sách ghi chú.', 'error')
    } finally {
      setIsLoading(false)
    }
  }, [showToast])

  useEffect(() => {
    let active = true
    void notesApi.getNotes()
      .then((result) => {
        if (active) {
          setNotes(result.data.notes)
          setLoadFailed(false)
        }
      })
      .catch((error: unknown) => {
        if (active) {
          setLoadFailed(true)
          showToast(error instanceof ApiError ? error.message : 'Không thể tải danh sách ghi chú.', 'error')
        }
      })
      .finally(() => { if (active) setIsLoading(false) })
    return () => { active = false }
  }, [showToast])

  const createNote = async () => {
    if (isCreating) return
    setIsCreating(true)
    try {
      const result = await notesApi.createNote()
      navigate(`/notes/${result.data.note.id}`)
    } catch (error) {
      showToast(error instanceof ApiError ? error.message : 'Không thể tạo ghi chú lúc này.', 'error')
      setIsCreating(false)
    }
  }

  return {
    notes,
    isLoading,
    isCreating,
    loadFailed,
    createNote,
    openNote: (noteId: string) => navigate(`/notes/${noteId}`),
    retry: loadNotes,
  }
}

