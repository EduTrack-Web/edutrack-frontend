export type NotificationType =
  | 'event_invitation'
  | 'event_reminder'
  | 'event_update'
  | 'event_response'
  | 'system'

export interface NotificationItem {
  id: string
  userId: string
  type: NotificationType
  title: string
  message: string
  link?: string
  isRead: boolean
  eventId?: string | null
  metadata?: {
    status?: 'pending' | 'accepted' | 'declined'
    startDate?: string
    location?: string
    [key: string]: unknown
  }
  createdAt: string
  updatedAt: string
}
