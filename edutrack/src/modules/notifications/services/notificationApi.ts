import { request } from '@/shared/api/httpClient'
import type { ApiSuccess } from '@/modules/auth/models/AuthUser'
import type { NotificationItem } from '../models/notification.types'

export const notificationApi = {
  getNotifications: () =>
    request<ApiSuccess<{ notifications: NotificationItem[]; unreadCount: number }>>('/notifications'),

  markAsRead: (notificationId: string) =>
    request<ApiSuccess<{ notification: NotificationItem }>>(`/notifications/${notificationId}`, {
      method: 'PATCH',
      body: JSON.stringify({ isRead: true }),
    }),

  markAllAsRead: () =>
    request<ApiSuccess<null>>('/notifications', {
      method: 'PATCH',
      body: JSON.stringify({ isRead: true }),
    }),

  deleteNotification: (notificationId: string) =>
    request<ApiSuccess<null>>(`/notifications/${notificationId}`, {
      method: 'DELETE',
    }),
}
