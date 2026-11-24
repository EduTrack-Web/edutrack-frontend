import { useCallback, useEffect, useRef, useState } from 'react'
import type { NotificationItem } from '../models/notification.types'
import { notificationApi } from '../services/notificationApi'
import { calendarApi } from '@/modules/calendar/services/calendarApi'
import { useRecurringConfirmation } from '@/modules/calendar/viewmodels/useRecurringConfirmation'
import { useToast } from '@/shared/viewmodels/useToast'

export function useNotifications() {
  const { confirmation, confirmRecurring } = useRecurringConfirmation()
  const responding = useRef(false)
  useEffect(() => () => { responding.current = false }, [])
  const [notifications, setNotifications] = useState<NotificationItem[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const { showToast } = useToast()

  const isFirstLoadRef = useRef(true)
  const knownUnreadEventIdsRef = useRef<Set<string>>(new Set())

  const fetchNotifications = useCallback(async (silent = false) => {
    if (!silent) setIsLoading(true)
    try {
      const res = await notificationApi.getNotifications()
      if (res.data) {
        setNotifications(res.data.notifications)
        setUnreadCount(res.data.unreadCount)

        const currentUnreadEventNotifs = res.data.notifications.filter(
          (n) =>
            (n.type === 'event_update' || n.type === 'event_invitation' || n.type === 'event_response') &&
            !n.isRead,
        )

        if (isFirstLoadRef.current) {
          isFirstLoadRef.current = false
          knownUnreadEventIdsRef.current = new Set(currentUnreadEventNotifs.map((n) => n.id))
        } else {
          const hasNewCalendarNotif = currentUnreadEventNotifs.some(
            (n) => !knownUnreadEventIdsRef.current.has(n.id),
          )
          if (hasNewCalendarNotif) {
            window.dispatchEvent(new CustomEvent('edutrack-calendar-refresh'))
          }
          knownUnreadEventIdsRef.current = new Set(currentUnreadEventNotifs.map((n) => n.id))
        }
      }
    } catch {
      if (!silent) showToast('Không thể tải thông báo. Vui lòng thử lại.', 'error')
    } finally {
      if (!silent) setIsLoading(false)
    }
  }, [showToast])

  useEffect(() => {
    let active = true
    const initTimer = window.setTimeout(() => {
      if (active) void fetchNotifications()
    }, 0)

    const timer = setInterval(() => {
      if (active) void fetchNotifications(true)
    }, 15000)

    return () => {
      active = false
      window.clearTimeout(initTimer)
      clearInterval(timer)
    }
  }, [fetchNotifications])

  const markAsRead = async (notificationId: string) => {
    try {
      await notificationApi.markAsRead(notificationId)
      setNotifications((prev) =>
        prev.map((n) => (n.id === notificationId ? { ...n, isRead: true } : n)),
      )
      setUnreadCount((prev) => Math.max(0, prev - 1))
    } catch {
      showToast('Không thể đánh dấu đã đọc thông báo.', 'error')
    }
  }

  const markAllAsRead = async () => {
    try {
      await notificationApi.markAllAsRead()
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })))
      setUnreadCount(0)
      showToast('Đã đánh dấu đã đọc tất cả thông báo.', 'info')
    } catch {
      showToast('Không thể đánh dấu tất cả đã đọc.', 'error')
    }
  }

  const deleteNotification = async (notificationId: string) => {
    try {
      await notificationApi.deleteNotification(notificationId)
      setNotifications((prev) => prev.filter((n) => n.id !== notificationId))
      setUnreadCount((prev) => {
        const item = notifications.find((n) => n.id === notificationId)
        return item && !item.isRead ? Math.max(0, prev - 1) : prev
      })
    } catch {
      showToast('Không thể xóa thông báo.', 'error')
    }
  }

  const respondInvitation = async (
    notificationId: string,
    eventId: string,
    status: 'accepted' | 'declined',
  ) => {
    if (responding.current) return
    responding.current = true
    try {
      const { data } = await calendarApi.getEventById(eventId)
      if (!responding.current) return
      const event = data.event
      if (event.recurrence && event.recurrence.frequency !== 'none') {
        if (!await confirmRecurring(status, event.entryType, event.title)) return
      }
      await calendarApi.respondInvite(eventId, status)
      setNotifications((prev) =>
        prev.map((n) =>
          n.id === notificationId || n.eventId === eventId
            ? {
                ...n,
                isRead: true,
                metadata: {
                  ...n.metadata,
                  status,
                  responded: true,
                },
              }
            : n,
        ),
      )
      setUnreadCount((prev) => Math.max(0, prev - 1))
      showToast(
        status === 'accepted'
          ? 'Đã đồng ý tham gia sự kiện. Sự kiện đã được thêm vào lịch của bạn.'
          : 'Đã từ chối tham gia sự kiện.',
        status === 'accepted' ? 'success' : 'info',
      )
      window.dispatchEvent(new CustomEvent('edutrack-calendar-refresh'))
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Không thể phản hồi lời mời.', 'error')
    } finally {
      responding.current = false
    }
  }

  return {
    confirmation,
    notifications,
    unreadCount,
    isLoading,
    refresh: fetchNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    respondInvitation,
  }
}
