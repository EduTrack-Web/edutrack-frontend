export type EntryType = 'event' | 'task'
export type EventPriority = 'low' | 'medium' | 'high' | 'urgent'
export type EventAvailability = 'busy' | 'free'
export type EventVisibility = 'default' | 'public' | 'private'
export type RecurrenceFrequency = 'none' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'weekdays' | 'custom'
export type RecurringUpdateMode = 'this' | 'following' | 'all' | 'all_this_weekday'
export type ReminderMethod = 'in-app' | 'email'

export interface CalendarPreferences {
  showLunarCalendar: boolean
  showVietnameseHolidays: boolean
  showPublicHolidays: boolean
  showObservanceHolidays: boolean
}

export type HolidayCategory = 'public_holiday' | 'observance'
export type HolidayCalendarType = 'solar' | 'lunar' | 'compensatory'

export interface HolidayLunarDateInfo {
  day: number
  month: number
  year: number
  isLeapMonth: boolean
  yearCanChi: string
}

export interface VietnameseHolidayItem {
  id: string
  solarDate: string
  name: string
  category: HolidayCategory
  calendarType: HolidayCalendarType
  isDayOff: boolean
  lunarDateLabel?: string
  lunarDate?: HolidayLunarDateInfo
  notes?: string
  sourceGroup?: 'rule' | 'official'
}

export interface VietnameseLunarDate {
  solarDate: string
  lunarDay: number
  lunarMonth: number
  lunarYear: number
  isLeapMonth: boolean
  timeZoneOffset?: 7 | 8
  alternateLunar?: {
    label: string
    lunarDay: number
    lunarMonth: number
    lunarYear: number
    isLeapMonth: boolean
  }
}

export interface EventGuest {
  email: string
  role?: 'viewer' | 'editor'
  canModify?: boolean
  canInviteOthers?: boolean
  canSeeGuestList?: boolean
  status?: 'pending' | 'accepted' | 'declined'
}

export interface CategoryMember {
  email: string
  role: 'viewer' | 'editor' | 'admin'
}

export interface SubtaskItem {
  id: string
  title: string
  isCompleted: boolean
}

export interface ReminderItem {
  method: ReminderMethod
  minutesBefore: number
}

export interface RecurrenceConfig {
  frequency: RecurrenceFrequency
  interval: number
  daysOfWeek?: number[]
  until?: string | null
  count?: number | null
}

export interface CalendarSettings {
  timeZone: string
  weekStartsOn?: 0 | 1
  workingHoursStart?: string
  workingHoursEnd?: string
  defaultDurationMinutes: number
  reminders: ReminderItem[]
  privacy?: 'private' | 'public'
  archived: boolean
  sharedWith?: CategoryMember[]
}

export interface CalendarCategory {
  settings?: CalendarSettings
  id: string
  userId: string
  name: string
  color: string
  description: string
  isVisible: boolean
  isDefault: boolean
  sharedWith?: CategoryMember[]
  isShared?: boolean
  isSubscribed?: boolean
  publicToken?: string | null
  myRole?: 'owner' | 'viewer' | 'editor' | 'admin'
  createdAt?: string
  updatedAt?: string
}

export interface CreateCategoryInput {
  settings?: CalendarSettings
  name: string
  color?: string
  description?: string
  sharedWith?: CategoryMember[]
}

export interface UpdateCategoryInput {
  settings?: CalendarSettings
  name?: string
  color?: string
  description?: string
  isVisible?: boolean
  sharedWith?: CategoryMember[]
}

export interface EventJoinRequestItem {
  id: string
  userId: string
  email: string
  fullName: string
  message: string
  status: 'pending' | 'approved' | 'rejected'
  createdAt: string
  respondedAt?: string | null
}

export interface SharedEventPreview {
  id: string
  title: string
  description: string
  startDate: string
  endDate: string
  isAllDay: boolean
  location: string
  onlineMeetingUrl: string
  color: string
  timeZone?: string
  creator: { id: string; fullName: string }
  recurrence?: RecurrenceConfig
  viewerStatus: 'owner' | 'accepted' | 'pending_invite' | 'pending_request' | 'rejected' | 'none'
  myRequestId?: string
}

export interface CalendarEvent {
  id: string
  userId: string
  creator?: { id: string; email: string; fullName: string }
  creatorEmail?: string
  googleSource?: {
    integrationId?: string
    calendarConnectionId?: string
    accountEmail: string
    calendarName?: string
    eventColorId?: string
    eventLabelId?: string
    eventColor?: string
    calendarColor: string
    accessRole?: GoogleCalendarAccessRole
    creator?: { email?: string; displayName?: string }
    organizer?: { email?: string; displayName?: string }
  }
  isGoogleReadOnly?: boolean
  syncOrigin?: 'local' | 'google'
  hasGoogleMappings?: boolean
  calendarId?: string | null
  calendar?: CalendarCategory | null
  entryType: EntryType
  title: string
  description: string
  priority: EventPriority
  startDate: string
  endDate: string
  deadline?: string | null
  isAllDay: boolean
  location: string
  onlineMeetingUrl: string
  submissionUrl: string
  color: string
  inheritsCalendarColor?: boolean
  availability: EventAvailability
  visibility: EventVisibility
  timeZone?: string
  guests?: EventGuest[]
  isCompleted: boolean
  completedAt?: string | null
  checklist: SubtaskItem[]
  reminders: ReminderItem[]
  recurrence?: RecurrenceConfig
  exceptionDates?: string[]
  shareToken?: string | null
  isShareEnabled?: boolean
  joinRequests?: EventJoinRequestItem[]
  createdAt?: string
  updatedAt?: string
}

export interface CreateEventInput {
  calendarId?: string | null
  entryType: EntryType
  title: string
  description?: string
  priority?: EventPriority
  startDate: string
  endDate: string
  deadline?: string | null
  isAllDay?: boolean
  location?: string
  onlineMeetingUrl?: string
  submissionUrl?: string
  color?: string
  availability?: EventAvailability
  visibility?: EventVisibility
  timeZone?: string
  guests?: EventGuest[]
  checklist?: SubtaskItem[]
  reminders?: ReminderItem[]
  recurrence?: RecurrenceConfig
}

export interface UpdateEventInput extends Partial<CreateEventInput> {
  isCompleted?: boolean
  mode?: RecurringUpdateMode
  targetDate?: string
  exceptionDates?: string[]
}

export interface EventQueryFilters {
  from?: string
  to?: string
  entryType?: EntryType
  calendarId?: string
  calendarIds?: string[]
  isCompleted?: boolean
  q?: string
}

export type GoogleCalendarConnectionState = 'connected' | 'reconnect_required'
export type GoogleCalendarSyncStatus = 'idle' | 'syncing' | 'success' | 'partial_conflict' | 'error'
export type GoogleSubCalendarSyncState =
  | 'unselected'
  | 'initial_sync_pending'
  | 'initial_sync_running'
  | 'initial_sync_failed'
  | 'active'
  | 'error'

export type GoogleCalendarAccessRole = 'owner' | 'writer' | 'reader' | 'freeBusyReader'

export interface GoogleCalendarProgress {
  syncedCount: number
  pagesProcessed: number
  completedAt: string | null
}

export interface GoogleCalendarConnectionItem {
  id: string
  integrationId: string
  googleCalendarId: string
  summary: string
  description: string
  timeZone: string
  backgroundColor: string
  foregroundColor: string
  accessRole: GoogleCalendarAccessRole
  isPrimary: boolean
  isSelected: boolean
  isVisible: boolean
  syncStatus: GoogleSubCalendarSyncState
  lastSyncedAt: string | null
  nextSyncAt?: string | null
  lastSyncError: string
  fullSyncProgress: GoogleCalendarProgress
}

export interface GoogleCalendarIntegrationStatus {
  id: string
  status: GoogleCalendarConnectionState
  googleSub: string
  googleEmail: string
  displayName: string
  avatarUrl: string
  isPrimarySyncAccount: boolean
  syncToGoogleEnabled: boolean
  syncFromGoogleEnabled: boolean
  lastSyncedAt: string | null
  lastError: string
  pendingConflictsCount: number
  calendars: GoogleCalendarConnectionItem[]
}

export type GoogleSyncJobType =
  | 'full_sync'
  | 'incremental_sync'
  | 'event_push'
  | 'event_delete'
  | 'conflict_resolve'
export type GoogleSyncJobStatus =
  | 'pending'
  | 'running'
  | 'retry_wait'
  | 'completed'
  | 'failed'
  | 'cancelled'

export interface GoogleSyncJobItem {
  id: string
  integrationId: string
  calendarConnectionId: string | null
  eventId: string | null
  jobType: GoogleSyncJobType
  status: GoogleSyncJobStatus
  retriesUsed: number
  maxRetries: number
  nextRetryAt: string | null
  lastErrorCode: string
  lastErrorMessage: string
  updatedAt: string
}

export interface GoogleIntegrationsPayload {
  isConfigured: boolean
  integrations: GoogleCalendarIntegrationStatus[]
  jobs: GoogleSyncJobItem[]
}

export interface GoogleSyncConflictVersion {
  title: string
  description: string
  startDate: string
  endDate: string
  isAllDay: boolean
  location: string
  onlineMeetingUrl: string
  availability: EventAvailability
  visibility: EventVisibility
  timeZone: string
  recurrence?: RecurrenceConfig
  exceptionDates?: string[]
  etag?: string
  updatedAt: string
}

export interface GoogleCalendarConflictItem {
  id: string
  integrationId: string | null
  calendarConnectionId: string | null
  accountEmail: string
  calendarName: string
  eventId: string
  googleEventId: string
  conflictedFields: string[]
  status?: string
  baseVersion?: GoogleSyncConflictVersion
  localVersion: GoogleSyncConflictVersion
  googleVersion: GoogleSyncConflictVersion
  createdAt: string
}
