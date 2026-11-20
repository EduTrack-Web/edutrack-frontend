import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
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

const normalizeSearchText = (value: string): string => value
  .normalize('NFD')
  .replace(/\p{Diacritic}/gu, '')
  .toLocaleLowerCase('vi')

const USER_SEARCH_DEBOUNCE_MS = 350
const DEFAULT_GROUP_DESCRIPTION = ''
const DEFAULT_GROUP_HISTORY_VISIBILITY: ChatGroupHistoryVisibility = 'all'

export function useCreateChatGroupViewModel(
  friends: ChatUserSummary[],
  onCreated?: () => void,
) {
  const navigate = useNavigate()
  const { showToast } = useToast()
  const [name, setName] = useState('')
  const [participantQuery, setParticipantQuery] = useState('')
  const [searchResults, setSearchResults] = useState<FriendSearchResult[]>([])
  const [selectedUsers, setSelectedUsers] = useState<ChatUserSummary[]>([])
  const [fieldErrors, setFieldErrors] = useState<Readonly<Record<string, string>>>({})
  const [isSearching, setIsSearching] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const latestSearchId = useRef(0)
  const visibleFriends = useMemo(() => {
    const query = normalizeSearchText(participantQuery.trim())
    if (!query || participantQuery.includes('@')) return query ? [] : friends
    return friends.filter((friend) =>
      normalizeSearchText(friend.username).includes(query))
  }, [friends, participantQuery])

  const searchUsers = useCallback(async (query: string) => {
    const searchId = ++latestSearchId.current
    setIsSearching(true)
    setFieldErrors((current) => withoutField(current, 'participantQuery'))
    try {
      const result = await chatApi.searchUsers(query)
      if (searchId === latestSearchId.current) setSearchResults(result.data.users)
    } catch (error) {
      if (searchId !== latestSearchId.current) return
      if (error instanceof ApiError && error.fieldErrors?.query) {
        setFieldErrors((current) => ({ ...current, participantQuery: error.fieldErrors?.query ?? '' }))
      } else {
        showToast(error instanceof ApiError ? error.message : 'Không thể tìm người dùng.', 'error')
      }
    } finally {
      if (searchId === latestSearchId.current) setIsSearching(false)
    }
  }, [showToast])

  useEffect(() => {
    const query = participantQuery.trim()
    if (!query) {
      latestSearchId.current += 1
      setIsSearching(false)
      setSearchResults([])
      return
    }

    const timeoutId = window.setTimeout(() => {
      void searchUsers(query)
    }, USER_SEARCH_DEBOUNCE_MS)
    return () => window.clearTimeout(timeoutId)
  }, [participantQuery, searchUsers])

  const toggleUser = (user: ChatUserSummary) => {
    setSelectedUsers((current) => current.some((item) => item.id === user.id)
      ? current.filter((item) => item.id !== user.id)
      : [...current, user])
    setFieldErrors((current) => withoutField(current, 'participantIds'))
  }

  const removeUser = (userId: string) => {
    setSelectedUsers((current) => current.filter((user) => user.id !== userId))
  }

  const clearSelectedUsers = () => {
    setSelectedUsers([])
    setFieldErrors((current) => withoutField(current, 'participantIds'))
  }

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    const participantIds = selectedUsers.map((user) => user.id)
    const validationErrors = validateChatGroupForm({
      name,
      description: DEFAULT_GROUP_DESCRIPTION,
      participantIds,
    })
    setFieldErrors(validationErrors)
    if (Object.keys(validationErrors).length > 0) return
    setIsSubmitting(true)
    try {
      const result = await chatApi.createGroup({
        name: name.trim().replace(/\s+/gu, ' '),
        description: DEFAULT_GROUP_DESCRIPTION,
        participantIds,
        historyVisibility: DEFAULT_GROUP_HISTORY_VISIBILITY,
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
    participantQuery,
    visibleFriends,
    searchResults,
    selectedUsers,
    fieldErrors,
    isSearching,
    isSubmitting,
    setName: (value: string) => { setName(value); setFieldErrors((current) => withoutField(current, 'name')) },
    setParticipantQuery: (value: string) => {
      latestSearchId.current += 1
      setParticipantQuery(value)
      setIsSearching(false)
      setSearchResults([])
      setFieldErrors((current) => withoutField(current, 'participantQuery'))
    },
    toggleUser,
    removeUser,
    clearSelectedUsers,
    submit,
  }
}
