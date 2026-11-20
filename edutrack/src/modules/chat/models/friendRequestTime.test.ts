import { describe, expect, it } from 'vitest'

import { formatFriendRequestElapsed } from '@/modules/chat/models/friendRequestTime'

const now = new Date('2026-11-19T10:00:00.000Z').getTime()

describe('formatFriendRequestElapsed', () => {
  it('formats recent requests in Vietnamese', () => {
    expect(formatFriendRequestElapsed('2026-11-19T09:55:00.000Z', 'VI', now)).toBe('5 phút trước')
  })

  it('formats older requests in English', () => {
    expect(formatFriendRequestElapsed('2026-11-17T10:00:00.000Z', 'EN', now)).toBe('2 days ago')
  })

  it('handles invalid timestamps without throwing', () => {
    expect(formatFriendRequestElapsed('invalid', 'VI', now)).toBe('Không rõ thời gian')
  })
})
