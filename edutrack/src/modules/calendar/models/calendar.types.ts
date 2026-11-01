export type EventType = 'class' | 'exam' | 'deadline' | 'personal'

export interface CalendarEvent {
  id: string
  title: string
  description?: string
  startDate: string
  endDate: string
  type: EventType
  color?: string
}

export interface CreateEventInput {
  title: string
  description?: string
  startDate: string
  endDate: string
  type: EventType
}

