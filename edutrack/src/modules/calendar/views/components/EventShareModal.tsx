import { useEffect, useState } from 'react'
import { Icon } from '@/shared/components/Icon'
import { useToast } from '@/shared/viewmodels/useToast'
import { chatApi } from '@/modules/chat/services/chatApi'
import type { ChatGroupSummary, DirectConversationSummary } from '@/modules/chat/models/chat.types'
import type { CalendarEvent } from '../../models/calendar.types'
import { calendarApi } from '../../services/calendarApi'

interface EventShareModalProps {
  isOpen: boolean
  event: CalendarEvent | null
  onClose: () => void
  onUpdated: (shareToken: string | null) => void
}

interface ChatTarget {
  key: string
  kind: 'direct' | 'group'
  id: string
  label: string
  subtitle: string
}

const sentStorageKey = (eventId: string) => `edutrack:event-share-sent:${eventId}`

const readSentKeys = (eventId: string): string[] => {
  try {
    const raw = sessionStorage.getItem(sentStorageKey(eventId))
    if (!raw) return []
    const parsed: unknown = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === 'string') : []
  } catch {
    return []
  }
}

const writeSentKeys = (eventId: string, keys: string[]) => {
  try {
    if (keys.length === 0) {
      sessionStorage.removeItem(sentStorageKey(eventId))
    } else {
      sessionStorage.setItem(sentStorageKey(eventId), JSON.stringify(keys))
    }
  } catch {
    // ignore storage errors
  }
}

export function EventShareModal({
  isOpen,
  event,
  onClose,
  onUpdated,
}: EventShareModalProps) {
  const { showToast } = useToast()
  const [shareToken, setShareToken] = useState<string | null>(null)
  const [isLoadingToken, setIsLoadingToken] = useState(false)
  const [isRevoking, setIsRevoking] = useState(false)

  const [targets, setTargets] = useState<ChatTarget[]>([])
  const [isLoadingTargets, setIsLoadingTargets] = useState(false)
  const [search, setSearch] = useState('')
  const [selectedKeys, setSelectedKeys] = useState<string[]>([])
  const [sentKeys, setSentKeys] = useState<string[]>([])
  const [noteMessage, setNoteMessage] = useState('')
  const [isSendingChat, setIsSendingChat] = useState(false)

  const realEventId = event
    ? (event as unknown as { _baseEventId?: string })._baseEventId || event.id
    : ''
  const initialShareToken = event?.isShareEnabled ? (event.shareToken ?? null) : null

  useEffect(() => {
    if (!isOpen || !realEventId) return
    let active = true

    const init = async () => {
      setSearch('')
      setSelectedKeys([])
      setSentKeys(readSentKeys(realEventId))
      setNoteMessage('')

      if (initialShareToken) {
        setShareToken(initialShareToken)
      } else {
        try {
          setIsLoadingToken(true)
          const res = await calendarApi.enableEventShare(realEventId)
          if (active && res.data?.shareToken) {
            setShareToken(res.data.shareToken)
            onUpdated(res.data.shareToken)
          }
        } catch {
          if (active) showToast('Không thể tạo liên kết chia sẻ, vui lòng thử lại.', 'error')
        } finally {
          if (active) setIsLoadingToken(false)
        }
      }

      try {
        setIsLoadingTargets(true)
        const [directRes, groupRes] = await Promise.all([
          chatApi.getDirectConversations().catch(() => null),
          chatApi.getGroups().catch(() => null),
        ])
        if (!active) return

        const directItems: ChatTarget[] = (directRes?.data?.conversations ?? []).map(
          (c: DirectConversationSummary) => ({
            key: `direct:${c.id}`,
            kind: 'direct',
            id: c.id,
            label: c.participant.fullName || c.participant.username || 'Người dùng',
            subtitle: c.participant.username ? `Nhắn trực tiếp • @${c.participant.username}` : 'Nhắn trực tiếp',
          }),
        )
        const groupItems: ChatTarget[] = (groupRes?.data?.groups ?? []).map(
          (g: ChatGroupSummary) => ({
            key: `group:${g.id}`,
            kind: 'group',
            id: g.id,
            label: g.name,
            subtitle: `Nhóm chat • ${g.memberCount} thành viên`,
          }),
        )
        setTargets([...directItems, ...groupItems])
      } finally {
        if (active) setIsLoadingTargets(false)
      }
    }

    void init()
    return () => {
      active = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, realEventId])

  if (!isOpen || !event) return null

  const shareUrl = shareToken ? `${window.location.origin}/calendar/shared/${shareToken}` : ''

  const handleCopyLink = async () => {
    if (!shareUrl) return
    try {
      await navigator.clipboard.writeText(shareUrl)
      showToast('Đã sao chép liên kết chia sẻ sự kiện.', 'success')
    } catch {
      showToast('Không thể sao chép tự động, vui lòng copy thủ công.', 'error')
    }
  }

  const handleRegenerateLink = async () => {
    try {
      setIsLoadingToken(true)
      const res = await calendarApi.enableEventShare(realEventId, true)
      if (res.data?.shareToken) {
        setShareToken(res.data.shareToken)
        setSentKeys([])
        writeSentKeys(realEventId, [])
        onUpdated(res.data.shareToken)
        showToast('Đã tạo liên kết chia sẻ mới (liên kết cũ đã hết hiệu lực).', 'info')
      }
    } catch {
      showToast('Không thể tạo liên kết chia sẻ, vui lòng thử lại.', 'error')
    } finally {
      setIsLoadingToken(false)
    }
  }

  const handleRevokeLink = async () => {
    try {
      setIsRevoking(true)
      await calendarApi.revokeEventShare(realEventId)
      setShareToken(null)
      setSentKeys([])
      writeSentKeys(realEventId, [])
      onUpdated(null)
      showToast('Đã thu hồi liên kết chia sẻ sự kiện.', 'info')
      onClose()
    } catch {
      showToast('Không thể thu hồi liên kết lúc này.', 'error')
    } finally {
      setIsRevoking(false)
    }
  }

  const toggleTarget = (key: string) => {
    setSelectedKeys((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key],
    )
  }

  const handleSendToChat = async () => {
    if (!shareUrl || selectedKeys.length === 0) return
    try {
      setIsSendingChat(true)
      const chosen = targets.filter((t) => selectedKeys.includes(t.key))
      const text = [
        noteMessage.trim() || `Mời bạn xem sự kiện "${event.title}" trên EduTrack:`,
        shareUrl,
      ].join('\n')

      await Promise.all(
        chosen.map((target) => {
          const clientMessageId =
            typeof crypto !== 'undefined' && crypto.randomUUID
              ? crypto.randomUUID()
              : `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
          return target.kind === 'direct'
            ? chatApi.sendDirectConversationMessage(target.id, text, clientMessageId)
            : chatApi.sendGroupMessage(target.id, text, clientMessageId)
        }),
      )

      showToast(`Đã gửi liên kết chia sẻ tới ${chosen.length} cuộc trò chuyện.`, 'success')
      const nextSent = Array.from(new Set([...sentKeys, ...chosen.map((t) => t.key)]))
      setSentKeys(nextSent)
      writeSentKeys(realEventId, nextSent)
      setSelectedKeys([])
      setNoteMessage('')
    } catch {
      showToast('Không thể gửi tin nhắn chia sẻ tới một số cuộc trò chuyện.', 'error')
    } finally {
      setIsSendingChat(false)
    }
  }

  const filteredTargets = targets.filter((t) =>
    `${t.label} ${t.subtitle}`.toLowerCase().includes(search.trim().toLowerCase()),
  )

  return (
    <div className="fixed inset-0 z-70 flex items-center justify-center p-3 sm:p-4">
      <div
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      <div
        aria-modal="true"
        className="relative z-10 flex max-h-[90vh] w-full max-w-lg flex-col rounded-2xl border border-slate-200/80 bg-white shadow-2xl dark:border-white/10 dark:bg-[#021024]"
        role="dialog"
      >
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 dark:border-white/10">
          <div className="min-w-0">
            <h2 className="truncate text-sm font-bold text-slate-900 dark:text-white">
              Chia sẻ sự kiện: {event.title}
            </h2>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Người xem mở liên kết có thể gửi yêu cầu xin tham gia để bạn duyệt
            </p>
          </div>
          <button
            aria-label="Đóng"
            className="grid size-8 shrink-0 place-items-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-white/10 dark:hover:text-white"
            onClick={onClose}
            type="button"
          >
            <Icon className="size-4" name="close" />
          </button>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto p-5">
          {event.recurrence && event.recurrence.frequency !== 'none' && (
            <div className="rounded-xl border border-blue-200 bg-blue-50/70 p-3 text-xs text-blue-800 dark:border-blue-900/40 dark:bg-blue-950/30 dark:text-blue-200">
              <strong>Lưu ý sự kiện lặp lại:</strong> Liên kết này chia sẻ toàn bộ chuỗi sự kiện. Khi bạn duyệt yêu cầu tham gia, người được duyệt sẽ thấy toàn bộ các lần lặp của sự kiện này trên lịch của họ.
            </div>
          )}

          <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5 dark:border-white/10 dark:bg-white/5 space-y-2.5">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-bold text-slate-800 dark:text-white">
                Liên kết chia sẻ sự kiện
              </span>
              {shareToken && (
                <div className="flex items-center gap-2">
                  <button
                    className="text-[11px] font-semibold text-blue-600 hover:underline dark:text-blue-400"
                    disabled={isLoadingToken}
                    onClick={() => void handleRegenerateLink()}
                    type="button"
                  >
                    Đổi link mới
                  </button>
                  <button
                    className="text-[11px] font-semibold text-rose-600 hover:underline dark:text-rose-400"
                    disabled={isRevoking}
                    onClick={() => void handleRevokeLink()}
                    type="button"
                  >
                    {isRevoking ? 'Đang thu hồi...' : 'Thu hồi link'}
                  </button>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2">
              <input
                aria-label="Liên kết chia sẻ sự kiện"
                className="flex-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-700 outline-hidden dark:border-white/10 dark:bg-white/10 dark:text-slate-200"
                readOnly
                type="text"
                value={isLoadingToken ? 'Đang tạo liên kết...' : shareUrl}
              />
              <button
                className="shrink-0 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-bold text-white shadow-2xs hover:bg-blue-700 disabled:opacity-50"
                disabled={!shareUrl || isLoadingToken}
                onClick={() => void handleCopyLink()}
                type="button"
              >
                Sao chép
              </button>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5 dark:border-white/10 dark:bg-white/5 space-y-3">
            <div>
              <h3 className="text-xs font-bold text-slate-800 dark:text-white">
                Chia sẻ qua Chat
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Chọn cuộc trò chuyện trực tiếp hoặc nhóm chat để gửi liên kết
              </p>
            </div>

            <input
              aria-label="Tìm cuộc trò chuyện"
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-800 outline-hidden focus:border-blue-600 dark:border-white/10 dark:bg-white/10 dark:text-white"
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm người nhận hoặc nhóm chat..."
              type="text"
              value={search}
            />

            <div className="max-h-44 space-y-1 overflow-y-auto pr-1">
              {isLoadingTargets ? (
                <p className="py-4 text-center text-xs text-slate-400">Đang tải danh sách chat...</p>
              ) : filteredTargets.length === 0 ? (
                <p className="py-4 text-center text-xs text-slate-400">Không có cuộc trò chuyện phù hợp.</p>
              ) : (
                filteredTargets.map((target) => {
                  const checked = selectedKeys.includes(target.key)
                  return (
                    <label
                      className={`flex cursor-pointer items-center justify-between gap-2 rounded-lg border px-3 py-2 text-xs transition ${
                        checked
                          ? 'border-blue-500 bg-blue-50/60 dark:border-blue-500/60 dark:bg-blue-950/30'
                          : 'border-slate-200/70 bg-white hover:bg-slate-50 dark:border-white/10 dark:bg-white/5'
                      }`}
                      key={target.key}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="truncate font-semibold text-slate-800 dark:text-white">{target.label}</p>
                          {sentKeys.includes(target.key) && (
                            <span className="shrink-0 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300">
                              ✓ Đã gửi
                            </span>
                          )}
                        </div>
                        <p className="truncate text-[10px] text-slate-500 dark:text-slate-400">{target.subtitle}</p>
                      </div>
                      <input
                        checked={checked}
                        className="size-4 shrink-0 rounded text-blue-600"
                        onChange={() => toggleTarget(target.key)}
                        type="checkbox"
                      />
                    </label>
                  )
                })
              )}
            </div>

            <textarea
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800 outline-hidden focus:border-blue-600 dark:border-white/10 dark:bg-white/10 dark:text-white"
              onChange={(e) => setNoteMessage(e.target.value)}
              placeholder="Lời nhắn kèm theo (không bắt buộc)..."
              rows={2}
              value={noteMessage}
            />

            <div className="flex justify-end">
              <button
                className="rounded-lg bg-blue-600 px-4 py-1.5 text-xs font-bold text-white shadow-2xs hover:bg-blue-700 disabled:opacity-50"
                disabled={!shareUrl || selectedKeys.length === 0 || isSendingChat}
                onClick={() => void handleSendToChat()}
                type="button"
              >
                {isSendingChat ? 'Đang gửi...' : `Gửi qua Chat (${selectedKeys.length})`}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
