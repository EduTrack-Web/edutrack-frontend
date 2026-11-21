import { useCallback, useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom'

import { ApiError } from '@/shared/api/httpClient'
import { useToast } from '@/shared/viewmodels/useToast'
import type {
  ChatGroupDetail,
  ChatGroupInviteResult,
  ChatMessage,
} from '@/modules/chat/models/chat.types'
import {
  countChatMessageCharacters,
  validateChatMessageContent,
} from '@/modules/chat/models/chatMessageValidation'
import { chatApi } from '@/modules/chat/services/chatApi'
import { createChatSocket } from '@/modules/chat/services/chatSocket'
import { useAuth } from '@/modules/auth/viewmodels/useAuth'
import { useChatLayout } from '@/modules/chat/viewmodels/useChatLayout'

interface GroupLocationState {
  invite?: ChatGroupInviteResult
}

export type ChatRealtimeStatus = 'connecting' | 'connected' | 'disconnected'

const mergeMessages = (
  currentMessages: readonly ChatMessage[],
  incomingMessages: readonly ChatMessage[],
): ChatMessage[] => {
  const byId = new Map(currentMessages.map((message) => [message.id, message]))
  for (const message of incomingMessages) byId.set(message.id, message)
  return [...byId.values()].sort((first, second) => {
    const timeDifference = new Date(first.createdAt).getTime() - new Date(second.createdAt).getTime()
    return timeDifference || first.id.localeCompare(second.id)
  })
}

const createClientMessageId = (): string => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `${Date.now()}_${Math.random().toString(36).slice(2, 14)}`
}

export function useChatGroupViewModel() {
  const { groupId = '' } = useParams()
  const [searchParams, setSearchParams] = useSearchParams()
  const highlightedMessageId = searchParams.get('message') ?? ''
  const location = useLocation()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { recordGroupMessage } = useChatLayout().vm
  const { showToast } = useToast()
  const initialInvite = (location.state as GroupLocationState | null)?.invite
  const [group, setGroup] = useState<ChatGroupDetail | null>(null)
  const [invite, setInvite] = useState<ChatGroupInviteResult | null>(initialInvite ?? null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [nextMessageCursor, setNextMessageCursor] = useState<string | null>(null)
  const [messageDraft, setMessageDraftState] = useState('')
  const [messageError, setMessageError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingOlderMessages, setIsLoadingOlderMessages] = useState(false)
  const [isSendingMessage, setIsSendingMessage] = useState(false)
  const [isCreatingInvite, setIsCreatingInvite] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [realtimeStatus, setRealtimeStatus] = useState<ChatRealtimeStatus>('connecting')

  const load = useCallback(async () => {
    if (!groupId) return
    setIsLoading(true)
    setLoadError(null)
    try {
      const [groupResult, messageResult] = await Promise.all([
        chatApi.getGroup(groupId),
        chatApi.getGroupMessages(groupId, undefined, highlightedMessageId || undefined),
      ])
      setGroup(groupResult.data.group)
      setMessages(messageResult.data.messages)
      setNextMessageCursor(messageResult.data.nextCursor)
    } catch (error) {
      setLoadError(error instanceof ApiError ? error.message : 'Không thể tải thông tin nhóm.')
    } finally {
      setIsLoading(false)
    }
  }, [groupId, highlightedMessageId])

  const catchUpMessages = useCallback(async () => {
    if (!groupId) return
    try {
      const result = await chatApi.getGroupMessages(groupId)
      setMessages((current) => mergeMessages(current, result.data.messages))
    } catch {
      // REST actions surface authentication or permission errors if reconnect cannot recover.
    }
  }, [groupId])

  useEffect(() => {
    const timer = window.setTimeout(() => { void load() }, 0)
    return () => window.clearTimeout(timer)
  }, [load])

  useEffect(() => {
    if (!group?.id) return undefined
    const socket = createChatSocket()
    let hasConnectedBefore = false

    const joinGroup = () => {
      setRealtimeStatus('connecting')
      socket.emit('chat:join-group', { groupId: group.id }, (result) => {
        if (result.success) {
          setRealtimeStatus('connected')
          if (hasConnectedBefore) void catchUpMessages()
          hasConnectedBefore = true
          return
        }
        setRealtimeStatus('disconnected')
      })
    }
    const receiveMessage = (message: ChatMessage) => {
      if (message.groupId === group.id) {
        setMessages((current) => mergeMessages(current, [message]))
        recordGroupMessage(message, user?.id ?? '')
      }
    }
    const markDisconnected = () => setRealtimeStatus('disconnected')

    socket.on('connect', joinGroup)
    socket.on('chat:message-created', receiveMessage)
    socket.on('disconnect', markDisconnected)
    socket.on('connect_error', markDisconnected)
    socket.connect()

    return () => {
      socket.emit('chat:leave-group', { groupId: group.id })
      socket.off('connect', joinGroup)
      socket.off('chat:message-created', receiveMessage)
      socket.off('disconnect', markDisconnected)
      socket.off('connect_error', markDisconnected)
      socket.disconnect()
    }
  }, [catchUpMessages, group?.id, recordGroupMessage, user?.id])

  const loadOlderMessages = async () => {
    if (!groupId || !nextMessageCursor || isLoadingOlderMessages) return
    setIsLoadingOlderMessages(true)
    try {
      const result = await chatApi.getGroupMessages(groupId, nextMessageCursor)
      setMessages((current) => mergeMessages(result.data.messages, current))
      setNextMessageCursor(result.data.nextCursor)
    } catch (error) {
      showToast(error instanceof ApiError ? error.message : 'Không thể tải thêm tin nhắn.', 'error')
    } finally {
      setIsLoadingOlderMessages(false)
    }
  }

  const sendMessage = async () => {
    if (!groupId || isSendingMessage) return
    const validationError = validateChatMessageContent(messageDraft)
    setMessageError(validationError)
    if (validationError) return

    const content = messageDraft.trim()
    setIsSendingMessage(true)
    try {
      const result = await chatApi.sendGroupMessage(groupId, content, createClientMessageId())
      setMessages((current) => mergeMessages(current, [result.data.message]))
      recordGroupMessage(result.data.message, user?.id ?? '')
      setMessageDraftState('')
      setMessageError(null)
    } catch (error) {
      if (error instanceof ApiError && error.fieldErrors?.content) {
        setMessageError(error.fieldErrors.content)
      } else {
        showToast(error instanceof ApiError ? error.message : 'Không thể gửi tin nhắn.', 'error')
      }
    } finally {
      setIsSendingMessage(false)
    }
  }

  const createInviteLink = async () => {
    if (!groupId || isCreatingInvite) return
    setIsCreatingInvite(true)
    try {
      const result = await chatApi.createGroupInviteLink(groupId)
      setInvite(result.data.invite)
      showToast(result.message ?? 'Đã tạo liên kết tham gia nhóm.', 'success')
    } catch (error) {
      showToast(error instanceof ApiError ? error.message : 'Không thể tạo liên kết tham gia.', 'error')
    } finally {
      setIsCreatingInvite(false)
    }
  }

  const copyInvite = async () => {
    if (!invite) return
    try {
      await navigator.clipboard.writeText(invite.url)
      showToast('Đã sao chép liên kết tham gia nhóm.', 'success')
    } catch {
      showToast('Không thể sao chép tự động. Vui lòng sao chép liên kết thủ công.', 'warning')
    }
  }

  const messageCharacterCount = useMemo(
    () => countChatMessageCharacters(messageDraft.trim()),
    [messageDraft],
  )

  return {
    group,
    invite,
    messages,
    highlightedMessageId,
    currentUserId: user?.id ?? '',
    messageDraft,
    messageError,
    messageCharacterCount,
    hasOlderMessages: Boolean(nextMessageCursor),
    isLoading,
    isLoadingOlderMessages,
    isSendingMessage,
    isCreatingInvite,
    realtimeStatus,
    loadError,
    setMessageDraft: (value: string) => {
      setMessageDraftState(value)
      setMessageError(null)
    },
    sendMessage,
    loadOlderMessages,
    goToLatestMessages: () => setSearchParams({}, { replace: true }),
    createInviteLink,
    copyInvite,
    retry: load,
    goBack: () => navigate('/chat'),
  }
}
