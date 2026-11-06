import { useCallback, useEffect, useState } from 'react'

import { ApiError } from '../../../shared/api/httpClient'
import { useToast } from '../../../shared/viewmodels/useToast'
import type {
  BlockedUserItem,
  ChatFriendsTab,
  ChatUserSummary,
  FriendRequestItem,
  FriendSearchResult,
} from '../models/chat.types'
import { chatApi } from '../services/chatApi'

const sortUsers = <T extends ChatUserSummary>(users: T[]): T[] =>
  [...users].sort((left, right) => left.username.localeCompare(right.username, 'vi'))

export function useChatViewModel() {
  const { showToast } = useToast()
  const [activeTab, setActiveTab] = useState<ChatFriendsTab>('friends')
  const [friends, setFriends] = useState<ChatUserSummary[]>([])
  const [requests, setRequests] = useState<FriendRequestItem[]>([])
  const [blockedUsers, setBlockedUsers] = useState<BlockedUserItem[]>([])
  const [query, setQuery] = useState('')
  const [queryError, setQueryError] = useState<string | null>(null)
  const [searchResults, setSearchResults] = useState<FriendSearchResult[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSearching, setIsSearching] = useState(false)
  const [hasSearched, setHasSearched] = useState(false)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [blockTarget, setBlockTarget] = useState<ChatUserSummary | null>(null)

  const load = useCallback(async () => {
    setIsLoading(true)
    try {
      const [friendsResult, requestsResult, blockedResult] = await Promise.all([
        chatApi.getFriends(),
        chatApi.getFriendRequests(),
        chatApi.getBlockedUsers(),
      ])
      setFriends(sortUsers(friendsResult.data.friends))
      setRequests(requestsResult.data.requests)
      setBlockedUsers(sortUsers(blockedResult.data.users))
    } catch (error) {
      showToast(error instanceof ApiError ? error.message : 'Không thể tải dữ liệu bạn bè.', 'error')
    } finally {
      setIsLoading(false)
    }
  }, [showToast])

  useEffect(() => {
    const timer = window.setTimeout(() => { void load() }, 0)
    return () => window.clearTimeout(timer)
  }, [load])

  const search = async () => {
    const normalizedQuery = query.trim()
    if (!normalizedQuery) {
      setQueryError('Vui lòng nhập username hoặc email.')
      setSearchResults([])
      return
    }
    setIsSearching(true)
    setHasSearched(true)
    setQueryError(null)
    try {
      const result = await chatApi.searchUsers(normalizedQuery)
      setSearchResults(result.data.users)
    } catch (error) {
      if (error instanceof ApiError && error.fieldErrors?.query) setQueryError(error.fieldErrors.query)
      else showToast(error instanceof ApiError ? error.message : 'Không thể tìm người dùng.', 'error')
    } finally {
      setIsSearching(false)
    }
  }

  const sendFriendRequest = async (user: FriendSearchResult) => {
    if (busyId) return
    setBusyId(user.id)
    try {
      const result = await chatApi.sendFriendRequest(user.username)
      setRequests((current) => [result.data.request, ...current])
      setSearchResults((current) => current.map((item) =>
        item.id === user.id ? { ...item, relation: 'outgoing' } : item))
      showToast(result.message ?? 'Đã gửi lời mời kết bạn.', 'success')
    } catch (error) {
      showToast(error instanceof ApiError ? error.message : 'Không thể gửi lời mời kết bạn.', 'error')
    } finally {
      setBusyId(null)
    }
  }

  const acceptRequest = async (request: FriendRequestItem) => {
    if (busyId) return
    setBusyId(request.id)
    try {
      const result = await chatApi.acceptFriendRequest(request.id)
      setRequests((current) => current.filter((item) => item.id !== request.id))
      setFriends((current) => sortUsers([...current.filter((item) => item.id !== result.data.friend.id), result.data.friend]))
      setSearchResults((current) => current.map((item) =>
        item.id === result.data.friend.id ? { ...item, relation: 'friend' } : item))
      showToast(result.message ?? 'Đã chấp nhận lời mời kết bạn.', 'success')
    } catch (error) {
      showToast(error instanceof ApiError ? error.message : 'Không thể chấp nhận lời mời.', 'error')
    } finally {
      setBusyId(null)
    }
  }

  const declineRequest = async (request: FriendRequestItem) => {
    if (busyId) return
    setBusyId(request.id)
    try {
      const result = await chatApi.declineFriendRequest(request.id)
      setRequests((current) => current.filter((item) => item.id !== request.id))
      setSearchResults((current) => current.map((item) =>
        item.id === request.user.id ? { ...item, relation: 'none' } : item))
      showToast(result.message ?? 'Đã từ chối lời mời kết bạn.', 'success')
    } catch (error) {
      showToast(error instanceof ApiError ? error.message : 'Không thể từ chối lời mời.', 'error')
    } finally {
      setBusyId(null)
    }
  }

  const confirmBlock = async () => {
    if (!blockTarget || busyId) return
    const target = blockTarget
    setBusyId(target.id)
    try {
      const result = await chatApi.blockUser(target.id)
      setFriends((current) => current.filter((item) => item.id !== target.id))
      setRequests((current) => current.filter((item) => item.user.id !== target.id))
      setSearchResults((current) => current.filter((item) => item.id !== target.id))
      setBlockedUsers((current) => sortUsers([...current.filter((item) => item.id !== target.id), result.data.user]))
      setBlockTarget(null)
      showToast(result.message ?? 'Đã chặn người dùng.', 'success')
    } catch (error) {
      showToast(error instanceof ApiError ? error.message : 'Không thể chặn người dùng.', 'error')
    } finally {
      setBusyId(null)
    }
  }

  const unblock = async (user: BlockedUserItem) => {
    if (busyId) return
    setBusyId(user.id)
    try {
      const result = await chatApi.unblockUser(user.id)
      setBlockedUsers((current) => current.filter((item) => item.id !== user.id))
      showToast(result.message ?? 'Đã bỏ chặn người dùng.', 'success')
    } catch (error) {
      showToast(error instanceof ApiError ? error.message : 'Không thể bỏ chặn người dùng.', 'error')
    } finally {
      setBusyId(null)
    }
  }

  return {
    activeTab,
    friends,
    requests,
    blockedUsers,
    query,
    queryError,
    searchResults,
    isLoading,
    isSearching,
    hasSearched,
    busyId,
    blockTarget,
    incomingRequestCount: requests.filter((item) => item.direction === 'incoming').length,
    setActiveTab,
    setQuery: (value: string) => {
      setQuery(value)
      setQueryError(null)
      setHasSearched(false)
      setSearchResults([])
    },
    search,
    sendFriendRequest,
    acceptRequest,
    declineRequest,
    requestBlock: setBlockTarget,
    cancelBlock: () => { if (!busyId) setBlockTarget(null) },
    confirmBlock,
    unblock,
    reload: load,
  }
}
