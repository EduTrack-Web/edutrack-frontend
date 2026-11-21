import { useEffect, useMemo, useRef, useState } from 'react'

import type {
  ChatGroupSummary,
  ChatMessageSearchResult,
  DirectConversationSummary,
  FriendSearchResult,
} from '@/modules/chat/models/chat.types'
import { removeAccountsDuplicatedByMatchedConversations } from '@/modules/chat/models/chatSearchResults'
import { validateChatSearchQuery } from '@/modules/chat/models/chatSearchValidation'
import { chatApi } from '@/modules/chat/services/chatApi'
import { ApiError } from '@/shared/api/httpClient'
import { useToast } from '@/shared/viewmodels/useToast'

export type ChatSearchTab = 'all' | 'contacts' | 'messages'

interface UseChatSidebarSearchOptions {
  groups: ChatGroupSummary[]
  directConversations: DirectConversationSummary[]
  onFriendRequestSent?: () => void | Promise<void>
}

export function useChatSidebarSearchViewModel({
  groups,
  directConversations,
  onFriendRequestSent,
}: UseChatSidebarSearchOptions) {
  const { showToast } = useToast()
  const requestSequence = useRef(0)
  const [query, setQuery] = useState('')
  const [activeTab, setActiveTab] = useState<ChatSearchTab>('all')
  const [accountResults, setAccountResults] = useState<FriendSearchResult[]>([])
  const [messageResults, setMessageResults] = useState<ChatMessageSearchResult[]>([])
  const [apiQueryError, setApiQueryError] = useState<string | null>(null)
  const [isSearching, setIsSearching] = useState(false)
  const [busyUserId, setBusyUserId] = useState<string | null>(null)
  const validation = useMemo(() => validateChatSearchQuery(query), [query])
  const queryError = validation.error ?? apiQueryError
  const normalizedQuery = validation.query.toLocaleLowerCase('vi')
  const isSearchMode = Boolean(validation.query)

  const matchedDirectConversations = useMemo(() => {
    if (!normalizedQuery) return directConversations
    return directConversations.filter((conversation) =>
      conversation.participant.fullName.toLocaleLowerCase('vi').includes(normalizedQuery)
      || conversation.participant.username.toLocaleLowerCase('vi').includes(normalizedQuery))
  }, [directConversations, normalizedQuery])

  const matchedGroups = useMemo(() => {
    if (!normalizedQuery) return groups
    return groups.filter((group) =>
      group.name.toLocaleLowerCase('vi').includes(normalizedQuery)
      || group.description.toLocaleLowerCase('vi').includes(normalizedQuery))
  }, [groups, normalizedQuery])

  const visibleAccountResults = useMemo(
    () => removeAccountsDuplicatedByMatchedConversations(accountResults, matchedDirectConversations),
    [accountResults, matchedDirectConversations],
  )

  useEffect(() => {
    const sequence = ++requestSequence.current
    if (!isSearchMode || validation.error) return undefined
    const timer = window.setTimeout(async () => {
      const accountRequest = validation.canSearchAccount
        ? chatApi.searchUsers(validation.query)
        : Promise.resolve(null)
      const [accountResult, messageResult] = await Promise.allSettled([
        accountRequest,
        chatApi.searchMessages(validation.query),
      ])
      if (sequence !== requestSequence.current) return

      if (accountResult.status === 'fulfilled') {
        setAccountResults(accountResult.value?.data.users ?? [])
      } else {
        const error = accountResult.reason
        if (error instanceof ApiError && error.fieldErrors?.query) setApiQueryError(error.fieldErrors.query)
        else setAccountResults([])
      }
      if (messageResult.status === 'fulfilled') {
        setMessageResults(messageResult.value.data.messages)
      } else {
        setMessageResults([])
        showToast(
          messageResult.reason instanceof ApiError
            ? messageResult.reason.message
            : 'Không thể tìm kiếm tin nhắn lúc này.',
          'error',
        )
      }
      setIsSearching(false)
    }, 300)

    return () => window.clearTimeout(timer)
  }, [isSearchMode, showToast, validation.canSearchAccount, validation.error, validation.query])

  const sendFriendRequest = async (user: FriendSearchResult) => {
    if (busyUserId) return
    setBusyUserId(user.id)
    try {
      const result = await chatApi.sendFriendRequest(user.username)
      setAccountResults((current) => current.map((item) =>
        item.id === user.id ? { ...item, relation: 'outgoing' } : item))
      showToast(result.message ?? 'Đã gửi lời mời kết bạn.', 'success')
      await onFriendRequestSent?.()
    } catch (error) {
      showToast(error instanceof ApiError ? error.message : 'Không thể gửi lời mời kết bạn.', 'error')
    } finally {
      setBusyUserId(null)
    }
  }

  const contactResultCount = matchedDirectConversations.length + visibleAccountResults.length
  const allResultCount = contactResultCount + matchedGroups.length + messageResults.length

  return {
    query,
    activeTab,
    queryError,
    isSearchMode,
    isSearching,
    busyUserId,
    matchedDirectConversations,
    matchedGroups,
    accountResults: visibleAccountResults,
    messageResults,
    contactResultCount,
    allResultCount,
    hasResults: activeTab === 'contacts'
      ? contactResultCount > 0
      : activeTab === 'messages'
        ? messageResults.length > 0
        : allResultCount > 0,
    noResultMessage: validation.canSearchAccount
      ? 'Email hoặc username chưa đăng ký tài khoản hoặc không cho phép tìm kiếm.'
      : 'Không tìm thấy kết quả nào. Vui lòng tìm từ khóa khác.',
    setActiveTab,
    setQuery: (value: string) => {
      const nextValidation = validateChatSearchQuery(value)
      setQuery(value)
      setAccountResults([])
      setMessageResults([])
      setApiQueryError(null)
      setIsSearching(Boolean(nextValidation.query && !nextValidation.error))
      if (!nextValidation.query) setActiveTab('all')
    },
    clearQuery: () => {
      setQuery('')
      setAccountResults([])
      setMessageResults([])
      setApiQueryError(null)
      setIsSearching(false)
      setActiveTab('all')
    },
    sendFriendRequest,
  }
}
