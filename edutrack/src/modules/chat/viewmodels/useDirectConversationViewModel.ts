import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'

import { useAuth } from '@/modules/auth/viewmodels/useAuth'
import type {
  DirectChatMessage,
  DirectConversationSummary,
} from '@/modules/chat/models/chat.types'
import {
  countChatMessageCharacters,
  validateChatMessageContent,
} from '@/modules/chat/models/chatMessageValidation'
import { chatApi } from '@/modules/chat/services/chatApi'
import { createChatSocket } from '@/modules/chat/services/chatSocket'
import { ApiError } from '@/shared/api/httpClient'
import { useToast } from '@/shared/viewmodels/useToast'
import { useChatLayout } from '@/modules/chat/viewmodels/useChatLayout'

const mergeMessages = (
  currentMessages: readonly DirectChatMessage[],
  incomingMessages: readonly DirectChatMessage[],
): DirectChatMessage[] => {
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

export function useDirectConversationViewModel() {
  const { conversationId = '' } = useParams()
  const [searchParams, setSearchParams] = useSearchParams()
  const highlightedMessageId = searchParams.get('message') ?? ''
  const navigate = useNavigate()
  const { user } = useAuth()
  const { recordDirectMessage } = useChatLayout().vm
  const { showToast } = useToast()
  const [conversation, setConversation] = useState<DirectConversationSummary | null>(null)
  const [messages, setMessages] = useState<DirectChatMessage[]>([])
  const [nextMessageCursor, setNextMessageCursor] = useState<string | null>(null)
  const [messageDraft, setMessageDraftState] = useState('')
  const [messageError, setMessageError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingOlderMessages, setIsLoadingOlderMessages] = useState(false)
  const [isSendingMessage, setIsSendingMessage] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!conversationId) return
    setIsLoading(true)
    setLoadError(null)
    try {
      const [conversationResult, messageResult] = await Promise.all([
        chatApi.getDirectConversation(conversationId),
        chatApi.getDirectConversationMessages(conversationId, undefined, highlightedMessageId || undefined),
      ])
      setConversation(conversationResult.data.conversation)
      setMessages(messageResult.data.messages)
      setNextMessageCursor(messageResult.data.nextCursor)
    } catch (error) {
      setLoadError(error instanceof ApiError ? error.message : 'Không thể tải cuộc trò chuyện.')
    } finally {
      setIsLoading(false)
    }
  }, [conversationId, highlightedMessageId])

  const catchUpMessages = useCallback(async () => {
    if (!conversationId) return
    try {
      const result = await chatApi.getDirectConversationMessages(conversationId)
      setMessages((current) => mergeMessages(current, result.data.messages))
    } catch {
      // REST actions surface authentication or permission errors if reconnect cannot recover.
    }
  }, [conversationId])

  useEffect(() => {
    const timer = window.setTimeout(() => { void load() }, 0)
    return () => window.clearTimeout(timer)
  }, [load])

  useEffect(() => {
    if (!conversation?.id) return undefined
    const socket = createChatSocket()
    let hasConnectedBefore = false
    const joinConversation = () => {
      socket.emit('chat:join-direct-conversation', { conversationId: conversation.id }, (result) => {
        if (result.success) {
          if (hasConnectedBefore) void catchUpMessages()
          hasConnectedBefore = true
        }
      })
    }
    const receiveMessage = (message: DirectChatMessage) => {
      if (message.conversationId === conversation.id) {
        setMessages((current) => mergeMessages(current, [message]))
        recordDirectMessage(message, user?.id ?? '')
      }
    }
    socket.on('connect', joinConversation)
    socket.on('chat:direct-message-created', receiveMessage)
    socket.connect()
    return () => {
      socket.emit('chat:leave-direct-conversation', { conversationId: conversation.id })
      socket.off('connect', joinConversation)
      socket.off('chat:direct-message-created', receiveMessage)
      socket.disconnect()
    }
  }, [catchUpMessages, conversation?.id, recordDirectMessage, user?.id])

  const loadOlderMessages = async () => {
    if (!conversationId || !nextMessageCursor || isLoadingOlderMessages) return
    setIsLoadingOlderMessages(true)
    try {
      const result = await chatApi.getDirectConversationMessages(conversationId, nextMessageCursor)
      setMessages((current) => mergeMessages(result.data.messages, current))
      setNextMessageCursor(result.data.nextCursor)
    } catch (error) {
      showToast(error instanceof ApiError ? error.message : 'Không thể tải thêm tin nhắn.', 'error')
    } finally {
      setIsLoadingOlderMessages(false)
    }
  }

  const sendMessage = async () => {
    if (!conversationId || isSendingMessage) return
    const validationError = validateChatMessageContent(messageDraft)
    setMessageError(validationError)
    if (validationError) return
    setIsSendingMessage(true)
    try {
      const result = await chatApi.sendDirectConversationMessage(
        conversationId,
        messageDraft.trim(),
        createClientMessageId(),
      )
      setMessages((current) => mergeMessages(current, [result.data.message]))
      recordDirectMessage(result.data.message, user?.id ?? '')
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

  const messageCharacterCount = useMemo(
    () => countChatMessageCharacters(messageDraft.trim()),
    [messageDraft],
  )

  return {
    conversation,
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
    loadError,
    setMessageDraft: (value: string) => {
      setMessageDraftState(value)
      setMessageError(null)
    },
    sendMessage,
    loadOlderMessages,
    goToLatestMessages: () => setSearchParams({}, { replace: true }),
    retry: load,
    goBack: () => navigate('/chat'),
  }
}
