import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'

import { ApiError } from '@/shared/api/httpClient'
import { useToast } from '@/shared/viewmodels/useToast'
import type { ChatGroupInvitePreview } from '@/modules/chat/models/chat.types'
import { chatApi } from '@/modules/chat/services/chatApi'

export function useChatGroupInviteViewModel() {
  const { token = '' } = useParams()
  const navigate = useNavigate()
  const { showToast } = useToast()
  const [preview, setPreview] = useState<ChatGroupInvitePreview | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isJoining, setIsJoining] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!token) return
    setIsLoading(true)
    setLoadError(null)
    try {
      const result = await chatApi.previewGroupInvite(token)
      setPreview(result.data.invite)
    } catch (error) {
      setLoadError(error instanceof ApiError ? error.message : 'Không thể mở liên kết tham gia nhóm.')
    } finally {
      setIsLoading(false)
    }
  }, [token])

  useEffect(() => {
    const timer = window.setTimeout(() => { void load() }, 0)
    return () => window.clearTimeout(timer)
  }, [load])

  const join = async () => {
    if (!token || isJoining) return
    if (preview?.alreadyMember) {
      navigate(`/chat/groups/${preview.group.id}`)
      return
    }
    setIsJoining(true)
    try {
      const result = await chatApi.joinGroupByInvite(token)
      showToast(result.message ?? 'Tham gia nhóm thành công.', 'success')
      navigate(`/chat/groups/${result.data.group.id}`, { replace: true })
    } catch (error) {
      showToast(error instanceof ApiError ? error.message : 'Không thể tham gia nhóm.', 'error')
    } finally {
      setIsJoining(false)
    }
  }

  return { preview, isLoading, isJoining, loadError, join, retry: load, goToChat: () => navigate('/chat') }
}
