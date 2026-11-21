import { describe, expect, it } from 'vitest'

import { formatChatPresence } from '@/modules/chat/models/chatPresence'

const now = new Date('2026-11-18T12:00:00.000Z').getTime()

describe('formatChatPresence', () => {
  it('shows the online label in Vietnamese and English', () => {
    expect(formatChatPresence(true, undefined, 'VI', now)).toBe('Đang hoạt động')
    expect(formatChatPresence(true, undefined, 'EN', now)).toBe('Active now')
  })

  it('formats recent offline activity by minute, hour and day', () => {
    expect(formatChatPresence(false, new Date(now - 5 * 60_000).toISOString(), 'VI', now)).toBe('Hoạt động 5 phút trước')
    expect(formatChatPresence(false, new Date(now - 2 * 3_600_000).toISOString(), 'EN', now)).toBe('Active 2 hours ago')
    expect(formatChatPresence(false, new Date(now - 3 * 86_400_000).toISOString(), 'VI', now)).toBe('Hoạt động 3 ngày trước')
  })

  it('uses an absolute date after seven days', () => {
    const lastActiveAt = new Date(now - 8 * 86_400_000).toISOString()
    expect(formatChatPresence(false, lastActiveAt, 'VI', now)).toMatch(/^Hoạt động \d{2}\/\d{2}\/2026$/u)
    expect(formatChatPresence(false, lastActiveAt, 'EN', now)).toMatch(/^Active on \d{2}\/\d{2}\/2026$/u)
  })
})
