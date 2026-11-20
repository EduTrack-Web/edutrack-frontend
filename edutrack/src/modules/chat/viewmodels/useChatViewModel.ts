import { useCallback, useEffect, useMemo, useState } from 'react'

import { ApiError } from '@/shared/api/httpClient'
import { useToast } from '@/shared/viewmodels/useToast'
import type {
  BlockedUserItem,
  ChatFriendsTab,
  ChatGroupSummary,
  ChatMessage,
  ChatUserSummary,
  DirectChatMessage,
  DirectConversationSummary,
  FriendRequestItem,
} from '@/modules/chat/models/chat.types'
import { chatApi } from '@/modules/chat/services/chatApi'
import { groupChatContacts, sortChatContacts } from '@/modules/chat/models/chatContacts'

const sortUsers = sortChatContacts

export function useChatViewModel() {
  const { showToast } = useToast()
  const [activeTab, setActiveTab] = useState<ChatFriendsTab>('friends')
  const [groups, setGroups] = useState<ChatGroupSummary[]>([])
  const [directConversations, setDirectConversations] = useState<DirectConversationSummary[]>([])
  const [isCreateGroupOpen, setIsCreateGroupOpen] = useState(false)
  const [friends, setFriends] = useState<ChatUserSummary[]>([])
  const [requests, setRequests] = useState<FriendRequestItem[]>([])
  const [blockedUsers, setBlockedUsers] = useState<BlockedUserItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [profileTarget, setProfileTarget] = useState<ChatUserSummary | null>(null)
  const [blockTarget, setBlockTarget] = useState<ChatUserSummary | null>(null)

  const load = useCallback(async () => {
    setIsLoading(true)
    try {
      const [groupsResult, conversationsResult, friendsResult, requestsResult, blockedResult] = await Promise.all([
        chatApi.getGroups(),
        chatApi.getDirectConversations(),
        chatApi.getFriends(),
        chatApi.getFriendRequests(),
        chatApi.getBlockedUsers(),
      ])
      setGroups(groupsResult.data.groups)
      setDirectConversations(conversationsResult.data.conversations)
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

  const acceptRequest = async (request: FriendRequestItem) => {
    if (busyId) return
    setBusyId(request.id)
    try {
      const result = await chatApi.acceptFriendRequest(request.id)
      setRequests((current) => current.filter((item) => item.id !== request.id))
      setFriends((current) => sortUsers([...current.filter((item) => item.id !== result.data.friend.id), result.data.friend]))
      try {
        const conversationsResult = await chatApi.getDirectConversations()
        setDirectConversations(conversationsResult.data.conversations)
      } catch {
        setDirectConversations((current) => [{
          id: request.id,
          participant: { ...result.data.friend, isOnline: false },
          createdAt: request.createdAt,
          updatedAt: new Date().toISOString(),
        }, ...current.filter((item) => item.participant.id !== result.data.friend.id)])
      }
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
      showToast(result.message ?? 'Đã từ chối lời mời kết bạn.', 'success')
    } catch (error) {
      showToast(error instanceof ApiError ? error.message : 'Không thể từ chối lời mời.', 'error')
    } finally {
      setBusyId(null)
    }
  }

  const revokeRequest = async (request: FriendRequestItem) => {
    if (busyId) return
    setBusyId(request.id)
    try {
      const result = await chatApi.revokeFriendRequest(request.id)
      setRequests((current) => current.filter((item) => item.id !== request.id))
      showToast(result.message ?? 'Đã thu hồi lời mời kết bạn.', 'success')
    } catch (error) {
      showToast(error instanceof ApiError ? error.message : 'Không thể thu hồi lời mời kết bạn.', 'error')
    } finally {
      setBusyId(null)
    }
  }

  const requestBlock = (user: ChatUserSummary) => {
    setProfileTarget(null)
    setBlockTarget(user)
  }

  const confirmBlock = async () => {
    if (!blockTarget || busyId) return
    const target = blockTarget
    setBusyId(target.id)
    try {
      const result = await chatApi.blockUser(target.id)
      setFriends((current) => current.filter((item) => item.id !== target.id))
      setRequests((current) => current.filter((item) => item.user.id !== target.id))
      setBlockedUsers((current) => sortUsers([...current.filter((item) => item.id !== target.id), result.data.user]))
      setDirectConversations((current) => current.filter((item) => item.participant.id !== target.id))
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

  const incomingRequests = useMemo(
    () => requests.filter((item) => item.direction === 'incoming'),
    [requests],
  )
  const outgoingRequests = useMemo(
    () => requests.filter((item) => item.direction === 'outgoing'),
    [requests],
  )
  const contactSections = useMemo(() => groupChatContacts(friends), [friends])

  const recordDirectMessage = useCallback((message: DirectChatMessage, currentUserId: string) => {
    setDirectConversations((current) => current
      .map((conversation) => conversation.id === message.conversationId
        ? {
          ...conversation,
          lastMessage: {
            id: message.id,
            content: message.content,
            sender: message.sender,
            isOwn: message.sender.id === currentUserId,
            createdAt: message.createdAt,
          },
          updatedAt: message.createdAt,
        }
        : conversation)
      .sort((first, second) => Date.parse(second.updatedAt) - Date.parse(first.updatedAt)))
  }, [])

  const recordGroupMessage = useCallback((message: ChatMessage, currentUserId: string) => {
    setGroups((current) => current
      .map((group) => group.id === message.groupId
        ? {
          ...group,
          lastMessage: {
            id: message.id,
            content: message.content,
            sender: message.sender,
            isOwn: message.sender.id === currentUserId,
            createdAt: message.createdAt,
          },
          updatedAt: message.createdAt,
        }
        : group)
      .sort((first, second) => Date.parse(second.updatedAt) - Date.parse(first.updatedAt)))
  }, [])

  return {
    activeTab,
    groups,
    directConversations,
    isCreateGroupOpen,
    friends,
    contactSections,
    incomingRequests,
    outgoingRequests,
    blockedUsers,
    isLoading,
    busyId,
    profileTarget,
    blockTarget,
    incomingRequestCount: incomingRequests.length,
    outgoingRequestCount: outgoingRequests.length,
    setActiveTab,
    openCreateGroup: () => setIsCreateGroupOpen(true),
    closeCreateGroup: () => setIsCreateGroupOpen(false),
    acceptRequest,
    declineRequest,
    revokeRequest,
    openProfile: setProfileTarget,
    closeProfile: () => setProfileTarget(null),
    requestBlock,
    cancelBlock: () => { if (!busyId) setBlockTarget(null) },
    confirmBlock,
    unblock,
    recordDirectMessage,
    recordGroupMessage,
    reload: load,
  }
}
