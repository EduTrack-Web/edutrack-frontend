import { useCallback, useEffect, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'

import { ApiError } from '@/shared/api/httpClient'
import { useToast } from '@/shared/viewmodels/useToast'
import type { ChatGroupDetail, ChatGroupInviteResult } from '@/modules/chat/models/chat.types'
import { chatApi } from '@/modules/chat/services/chatApi'

interface GroupLocationState {
  invite?: ChatGroupInviteResult
}

export function useChatGroupViewModel() {
  const { groupId = '' } = useParams()
  const location = useLocation()
  const navigate = useNavigate()
  const { showToast } = useToast()
  const initialInvite = (location.state as GroupLocationState | null)?.invite
  const [group, setGroup] = useState<ChatGroupDetail | null>(null)
  const [invite, setInvite] = useState<ChatGroupInviteResult | null>(initialInvite ?? null)
  const [isLoading, setIsLoading] = useState(true)
  const [isCreatingInvite, setIsCreatingInvite] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!groupId) return
    setIsLoading(true)
    setLoadError(null)
    try {
      const result = await chatApi.getGroup(groupId)
      setGroup(result.data.group)
    } catch (error) {
      setLoadError(error instanceof ApiError ? error.message : 'Không thể tải thông tin nhóm.')
    } finally {
      setIsLoading(false)
    }
  }, [groupId])

  useEffect(() => {
    const timer = window.setTimeout(() => { void load() }, 0)
    return () => window.clearTimeout(timer)
  }, [load])

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

  return {
    group,
    invite,
    isLoading,
    isCreatingInvite,
    loadError,
    createInviteLink,
    copyInvite,
    retry: load,
    goBack: () => navigate('/chat'),
  }
}
