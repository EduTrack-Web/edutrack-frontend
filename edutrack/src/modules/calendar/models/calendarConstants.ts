import type { EventPriority, ReminderMethod } from './calendar.types'

export interface PriorityDetail {
  value: EventPriority
  label: string
  color: string
  dotColor: string
  defaultReminders: { method: ReminderMethod; quantity: number; unit: 'minutes' | 'hours' | 'days' | 'weeks' }[]
}

export const PRIORITY_CONFIG: Record<EventPriority, PriorityDetail> = {
  urgent: {
    value: 'urgent',
    label: 'Khẩn cấp',
    color: '#EF4444',
    dotColor: 'bg-red-500',
    defaultReminders: [
      { method: 'in-app', quantity: 15, unit: 'minutes' },
      { method: 'in-app', quantity: 1, unit: 'hours' },
    ],
  },
  high: {
    value: 'high',
    label: 'Ưu tiên cao',
    color: '#F59E0B',
    dotColor: 'bg-amber-500',
    defaultReminders: [
      { method: 'in-app', quantity: 1, unit: 'hours' },
    ],
  },
  medium: {
    value: 'medium',
    label: 'Trung bình',
    color: '#3B82F6',
    dotColor: 'bg-blue-500',
    defaultReminders: [
      { method: 'in-app', quantity: 1, unit: 'days' },
    ],
  },
  low: {
    value: 'low',
    label: 'Thấp',
    color: '#64748B',
    dotColor: 'bg-slate-400',
    defaultReminders: [
      { method: 'in-app', quantity: 15, unit: 'minutes' },
    ],
  },
}

export const COMMON_TIMEZONES = [
  { value: 'Asia/Ho_Chi_Minh', label: 'Việt Nam (GMT+7 - Asia/Ho_Chi_Minh)' },
  { value: 'Asia/Bangkok', label: 'Bangkok, Jakarta (GMT+7)' },
  { value: 'Asia/Singapore', label: 'Singapore, Kuala Lumpur (GMT+8)' },
  { value: 'Asia/Tokyo', label: 'Tokyo, Seoul (GMT+9)' },
  { value: 'Australia/Sydney', label: 'Sydney, Melbourne (GMT+11)' },
  { value: 'Europe/London', label: 'London (GMT+0 / GMT+1)' },
  { value: 'Europe/Paris', label: 'Paris, Berlin (GMT+1 / GMT+2)' },
  { value: 'America/New_York', label: 'New York, Toronto (GMT-5 / GMT-4)' },
  { value: 'America/Los_Angeles', label: 'Los Angeles, San Francisco (GMT-8 / GMT-7)' },
  { value: 'UTC', label: 'Giờ phối hợp quốc tế (UTC)' },
]
