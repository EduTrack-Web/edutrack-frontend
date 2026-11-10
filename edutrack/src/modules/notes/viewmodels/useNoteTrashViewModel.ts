import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { ApiError } from '@/shared/api/httpClient'
import { useToast } from '@/shared/viewmodels/useToast'
import type { TrashedNoteSummary } from '@/modules/notes/models/notes.types'
import { notesApi } from '@/modules/notes/services/notesApi'

export function useNoteTrashViewModel() {
  const navigate = useNavigate()
  const { showToast } = useToast()
  const [notes, setNotes] = useState<TrashedNoteSummary[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [loadFailed, setLoadFailed] = useState(false)
  const [busyNoteId, setBusyNoteId] = useState<string | null>(null)
  const [noteToDelete, setNoteToDelete] = useState<TrashedNoteSummary | null>(null)

  const loadNotes = useCallback(async () => {
    setIsLoading(true)
    setLoadFailed(false)
    try {
      const result = await notesApi.getTrashedNotes()
      setNotes(result.data.notes)
    } catch (error) {
      setLoadFailed(true)
      showToast(error instanceof ApiError ? error.message : 'Không thể tải thùng rác ghi chú.', 'error')
    } finally {
      setIsLoading(false)
    }
  }, [showToast])

  useEffect(() => {
    let active = true
    void notesApi.getTrashedNotes()
      .then((result) => {
        if (active) {
          setNotes(result.data.notes)
          setLoadFailed(false)
        }
      })
      .catch((error: unknown) => {
        if (active) {
          setLoadFailed(true)
          showToast(error instanceof ApiError ? error.message : 'Không thể tải thùng rác ghi chú.', 'error')
        }
      })
      .finally(() => { if (active) setIsLoading(false) })
    return () => { active = false }
  }, [showToast])

  const restoreNote = async (noteId: string) => {
    if (busyNoteId) return
    setBusyNoteId(noteId)
    try {
      const result = await notesApi.restoreNote(noteId)
      setNotes((current) => current.filter((note) => note.id !== noteId))
      showToast(result.message ?? 'Đã khôi phục ghi chú.', 'success')
    } catch (error) {
      showToast(error instanceof ApiError ? error.message : 'Không thể khôi phục ghi chú.', 'error')
    } finally {
      setBusyNoteId(null)
    }
  }

  const deletePermanently = async () => {
    if (!noteToDelete || busyNoteId) return
    const noteId = noteToDelete.id
    setBusyNoteId(noteId)
    try {
      const result = await notesApi.deletePermanently(noteId)
      setNotes((current) => current.filter((note) => note.id !== noteId))
      setNoteToDelete(null)
      showToast(result.message ?? 'Đã xóa vĩnh viễn ghi chú.', 'success')
    } catch (error) {
      showToast(error instanceof ApiError ? error.message : 'Không thể xóa vĩnh viễn ghi chú.', 'error')
    } finally {
      setBusyNoteId(null)
    }
  }

  return {
    notes,
    isLoading,
    loadFailed,
    busyNoteId,
    noteToDelete,
    restoreNote,
    deletePermanently,
    requestPermanentDelete: (note: TrashedNoteSummary) => setNoteToDelete(note),
    cancelPermanentDelete: () => { if (!busyNoteId) setNoteToDelete(null) },
    retry: loadNotes,
    goToNotes: () => navigate('/notes'),
  }
}
