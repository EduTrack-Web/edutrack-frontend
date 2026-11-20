import { describe, expect, it } from 'vitest'

import { formatConversationListTime } from '@/modules/chat/models/conversationListTime'

const now = new Date('2026-11-20T12:00:00+07:00').getTime()

describe('formatConversationListTime', () => {
  it('uses compact relative times for recent messages', () => {
    expect(formatConversationListTime('2026-11-20T11:25:00+07:00', 'VI', now)).toBe('35 phút')
    expect(formatConversationListTime('2026-11-20T06:00:00+07:00', 'VI', now)).toBe('6 giờ')
  })

  it('labels yesterday and formats older dates compactly', () => {
    expect(formatConversationListTime('2026-11-19T08:00:00+07:00', 'VI', now)).toBe('Hôm qua')
    expect(formatConversationListTime('2026-11-10T08:00:00+07:00', 'VI', now)).toBe('10/11')
  })
})
