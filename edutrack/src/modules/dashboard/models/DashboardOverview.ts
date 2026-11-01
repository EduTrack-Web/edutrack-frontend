import type { IconName } from '../../../shared/components/Icon'

export interface DashboardStat {
  label: string
  value: string
  subtext: string
  change?: string
  trend?: 'up' | 'down' | 'neutral'
  icon: IconName
  badge?: string
}

export interface UpcomingEventItem {
  id: string
  title: string
  time: string
  location?: string
  type: 'class' | 'exam' | 'deadline'
}

export interface RecentNoteItem {
  id: string
  title: string
  subject: string
  timeAgo: string
}

export interface DashboardModuleItem {
  name: string
  description: string
  path: string
  icon: IconName
  tag: string
}

export interface DashboardOverview {
  title: string
  description: string
  stats: readonly DashboardStat[]
  upcomingEvents: readonly UpcomingEventItem[]
  recentNotes: readonly RecentNoteItem[]
  modules: readonly DashboardModuleItem[]
}
