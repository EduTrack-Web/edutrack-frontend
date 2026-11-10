import { useEffect, useState } from 'react'

import { ApiError } from '@/shared/api/httpClient'
import { useToast } from '@/shared/viewmodels/useToast'
import type { NoteCollaborator, NotePermission, NoteShareUser } from '@/modules/notes/models/notes.types'
import { notesApi } from '@/modules/notes/services/notesApi'

type PendingShareAction =
  | { type: 'set'; user: NoteShareUser; permission: NotePermission }
  | { type: 'remove'; user: NoteCollaborator }

export function useNoteShareViewModel() {
  const { showToast } = useToast()
  const [noteId, setNoteId] = useState<string | null>(null)
  const [owner, setOwner] = useState<NoteShareUser | null>(null)
  const [collaborators, setCollaborators] = useState<NoteCollaborator[]>([])
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<NoteShareUser[]>([])
  const [permission, setPermission] = useState<NotePermission>('view')
  const [isLoading, setIsLoading] = useState(false)
  const [isSearching, setIsSearching] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [pendingAction, setPendingAction] = useState<PendingShareAction | null>(null)

  const open = async (targetNoteId: string) => {
    setNoteId(targetNoteId)
    setIsLoading(true)
    setQuery('')
    setResults([])
    try {
      const result = await notesApi.getCollaborators(targetNoteId)
      setOwner(result.data.owner)
      setCollaborators(result.data.collaborators)
    } catch (error) {
      setNoteId(null)
      showToast(error instanceof ApiError ? error.message : 'Không thể tải quyền truy cập ghi chú.', 'error')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (!noteId || query.trim().length < 2) {
      return undefined
    }
    let active = true
    const timer = window.setTimeout(() => {
      setIsSearching(true)
      void notesApi.searchShareUsers(noteId, query.trim())
        .then((result) => { if (active) setResults(result.data.users) })
        .catch((error: unknown) => {
          if (active) showToast(error instanceof ApiError ? error.message : 'Không thể tìm người dùng.', 'error')
        })
        .finally(() => { if (active) setIsSearching(false) })
    }, 300)
    return () => {
      active = false
      window.clearTimeout(timer)
    }
  }, [noteId, query, showToast])

  const confirmAction = async () => {
    if (!noteId || !pendingAction || isSaving) return
    setIsSaving(true)
    try {
      if (pendingAction.type === 'set') {
        const result = await notesApi.setCollaborator(noteId, pendingAction.user.id, pendingAction.permission)
        setCollaborators((current) => {
          const withoutTarget = current.filter((item) => item.id !== result.data.collaborator.id)
          return [...withoutTarget, result.data.collaborator].sort((left, right) => left.username.localeCompare(right.username))
        })
        showToast(result.message ?? 'Đã cập nhật quyền truy cập ghi chú.', 'success')
      } else {
        const result = await notesApi.removeCollaborator(noteId, pendingAction.user.id)
        setCollaborators((current) => current.filter((item) => item.id !== pendingAction.user.id))
        showToast(result.message ?? 'Đã thu hồi quyền truy cập ghi chú.', 'success')
      }
      setPendingAction(null)
      setQuery('')
      setResults([])
    } catch (error) {
      showToast(error instanceof ApiError ? error.message : 'Không thể cập nhật quyền truy cập.', 'error')
    } finally {
      setIsSaving(false)
    }
  }

  return {
    noteId,
    owner,
    collaborators,
    query,
    results,
    permission,
    isLoading,
    isSearching,
    isSaving,
    pendingAction,
    open,
    close: () => { if (!isSaving) setNoteId(null) },
    updateQuery: (value: string) => {
      setQuery(value)
      if (value.trim().length < 2) {
        setResults([])
        setIsSearching(false)
      }
    },
    updatePermission: setPermission,
    requestShare: (user: NoteShareUser) => setPendingAction({ type: 'set', user, permission }),
    requestPermissionChange: (user: NoteCollaborator, nextPermission: NotePermission) =>
      setPendingAction({ type: 'set', user, permission: nextPermission }),
    requestRemove: (user: NoteCollaborator) => setPendingAction({ type: 'remove', user }),
    cancelPendingAction: () => { if (!isSaving) setPendingAction(null) },
    confirmAction,
  }
}
