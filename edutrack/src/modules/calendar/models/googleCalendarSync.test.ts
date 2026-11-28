import { describe, expect, it } from 'vitest'
import type { GoogleCalendarIntegrationStatus } from './calendar.types'
import {
  formatConflictVersionRange,
  formatReadOnlyEventSchedule,
  getGoogleAccessRoleLabel,
  resolveGoogleSyncRedirectFeedback,
  sortGoogleIntegrations,
} from './googleCalendarSync'

describe('googleCalendarSync helpers', () => {
  it('maps UC-12 OAuth redirect query states including multi-account connection', () => {
    expect(
      resolveGoogleSyncRedirectFeedback({
        googleSyncSuccess: 'ACCOUNT_CONNECTED',
        googleSyncError: null,
        integrationId: 'int-1',
      }),
    ).toMatchObject({
      type: 'success',
      openCalendarSelectionIntegrationId: 'int-1',
    })

    expect(
      resolveGoogleSyncRedirectFeedback({
        googleSyncSuccess: null,
        googleSyncError: 'GOOGLE_CALENDAR_PERMISSION_DENIED',
      }),
    ).toEqual({
      type: 'error',
      message: 'Không thể đồng bộ do chưa cấp quyền',
      openConflicts: false,
    })

    expect(
      resolveGoogleSyncRedirectFeedback({
        googleSyncSuccess: null,
        googleSyncError: 'GOOGLE_CALENDAR_CONNECT_FAILED',
      }),
    ).toEqual({
      type: 'error',
      message: 'Không thể kết nối Google, vui lòng thử lại',
      openConflicts: false,
    })
  })

  it('places primary Google sync account first in sidebar sorting', () => {
    const makeIntegration = (
      id: string,
      googleEmail: string,
      isPrimarySyncAccount: boolean,
    ): GoogleCalendarIntegrationStatus => ({
      id,
      googleSub: `sub-${id}`,
      googleEmail,
      displayName: googleEmail,
      avatarUrl: '',
      status: 'connected',
      isPrimarySyncAccount,
      syncToGoogleEnabled: isPrimarySyncAccount,
      syncFromGoogleEnabled: true,
      lastSyncedAt: null,
      lastError: '',
      pendingConflictsCount: 0,
      calendars: [],
    })

    const sorted = sortGoogleIntegrations([
      makeIntegration('2', 'alpha@gmail.com', false),
      makeIntegration('1', 'zeta@gmail.com', true),
    ])
    expect(sorted.map((item) => item.id)).toEqual(['1', '2'])
    expect(getGoogleAccessRoleLabel('reader')).toBe('Chỉ xem')
    expect(getGoogleAccessRoleLabel('writer')).toBe('Có quyền sửa')
  })

  it('formats all-day and timed conflict ranges clearly', () => {
    const allDaySingle = formatConflictVersionRange({
      startDate: '2026-11-25T00:00:00+07:00',
      endDate: '2026-11-25T23:59:59+07:00',
      isAllDay: true,
    })
    expect(allDaySingle).toContain('Cả ngày')
    expect(allDaySingle).toContain('25/11/2026')

    const timedSameDay = formatConflictVersionRange({
      startDate: '2026-11-25T09:00:00+07:00',
      endDate: '2026-11-25T10:30:00+07:00',
      isAllDay: false,
    })
    expect(timedSameDay).toContain('25/11/2026')
    expect(timedSameDay).toContain('09:00 – 10:30')
  })

  it('formats read-only event detail schedules cleanly for all-day and timed events', () => {
    const allDaySameYear = formatReadOnlyEventSchedule(
      '2026-11-02T00:00:00+07:00',
      '2026-11-02T23:59:59+07:00',
      true,
      'Asia/Ho_Chi_Minh',
      2026,
    )
    expect(allDaySameYear).toBe('Thứ Hai, 2 tháng 11')

    const timedSameDay = formatReadOnlyEventSchedule(
      '2026-11-02T03:28:00+07:00',
      '2026-11-02T04:28:00+07:00',
      false,
      'Asia/Ho_Chi_Minh',
      2026,
    )
    expect(timedSameDay).toBe('Thứ Hai, 2 tháng 11 • 03:28 – 04:28')
  })
})
