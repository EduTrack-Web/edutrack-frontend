import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'

import { ApiError } from '@/shared/api/httpClient'
import { useToast } from '@/shared/viewmodels/useToast'
import { validateChatGroupForm } from '@/modules/chat/models/chatGroupValidation'
import type { ChatGroupHistoryVisibility, ChatUserSummary, FriendSearchResult } from '@/modules/chat/models/chat.types'
import { chatApi } from '@/modules/chat/services/chatApi'

const withoutField = (
  errors: Readonly<Record<string, string>>,
  field: string,
): Readonly<Record<string, string>> => {
  const next = { ...errors }
  delete next[field]
  return next
}

export function useCreateChatGroupViewModel(onCreated?: () => void) {
  const navigate = useNavigate()
  const { showToast } = useToast()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [historyVisibility, setHistoryVisibility] = useState<ChatGroupHistoryVisibility>('from_join')
  const [participantQuery, setParticipantQuery] = useState('')
  const [searchResults, setSearchResults] = useState<FriendSearchResult[]>([])
  const [selectedUsers, setSelectedUsers] = useState<ChatUserSummary[]>([])
  const [fieldErrors, setFieldErrors] = useState<Readonly<Record<string, string>>>({})
  const [isSearching, setIsSearching] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const searchUsers = async () => {
    const query = participantQuery.trim()
    if (!query) {
      setFieldErrors((current) => ({ ...current, participantQuery: 'Vui lòng nhập username hoặc email.' }))
      setSearchResults([])
      return
    }
    setIsSearching(true)
    setFieldErrors((current) => withoutField(current, 'participantQuery'))
    try {
      const result = await chatApi.searchUsers(query)
      const selectedIds = new Set(selectedUsers.map((user) => user.id))
      setSearchResults(result.data.users.filter((user) => !selectedIds.has(user.id)))
    } catch (error) {
      if (error instanceof ApiError && error.fieldErrors?.query) {
        setFieldErrors((current) => ({ ...current, participantQuery: error.fieldErrors?.query ?? '' }))
      } else {
        showToast(error instanceof ApiError ? error.message : 'Không thể tìm người dùng.', 'error')
      }
    } finally {
      setIsSearching(false)
    }
  }

  const selectUser = (user: FriendSearchResult) => {
    setSelectedUsers((current) => current.some((item) => item.id === user.id) ? current : [...current, user])
    setSearchResults((current) => current.filter((item) => item.id !== user.id))
    setFieldErrors((current) => withoutField(current, 'participantIds'))
  }

  const removeUser = (userId: string) => {
    setSelectedUsers((current) => current.filter((user) => user.id !== userId))
  }

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    const participantIds = selectedUsers.map((user) => user.id)
    const validationErrors = validateChatGroupForm({ name, description, participantIds })
    setFieldErrors(validationErrors)
    if (Object.keys(validationErrors).length > 0) return
    setIsSubmitting(true)
    try {
      const result = await chatApi.createGroup({
        name: name.trim().replace(/\s+/gu, ' '),
        description: description.trim().replace(/\s+/gu, ' '),
        participantIds,
        historyVisibility,
      })
      onCreated?.()
      showToast(result.message ?? 'Tạo nhóm trò chuyện thành công.', 'success')
      navigate(`/chat/groups/${result.data.group.id}`, {
        state: { invite: result.data.invite },
      })
    } catch (error) {
      if (error instanceof ApiError && error.fieldErrors && Object.keys(error.fieldErrors).length > 0) {
        setFieldErrors(error.fieldErrors)
      } else {
        showToast(error instanceof ApiError ? error.message : 'Không thể tạo nhóm trò chuyện.', 'error')
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return {
    name,
    description,
    historyVisibility,
    participantQuery,
    searchResults,
    selectedUsers,
    fieldErrors,
    isSearching,
    isSubmitting,
    setName: (value: string) => { setName(value); setFieldErrors((current) => withoutField(current, 'name')) },
    setDescription: (value: string) => { setDescription(value); setFieldErrors((current) => withoutField(current, 'description')) },
    setHistoryVisibility,
    setParticipantQuery: (value: string) => {
      setParticipantQuery(value)
      setSearchResults([])
      setFieldErrors((current) => withoutField(current, 'participantQuery'))
    },
    searchUsers,
    selectUser,
    removeUser,
    submit,
  }
}
