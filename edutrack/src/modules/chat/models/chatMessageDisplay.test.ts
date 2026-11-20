import { describe, expect, it } from 'vitest'

import {
  endsMessageRun,
  formatMessageDate,
  formatMessageTime,
  startsMessageDate,
  startsMessageRun,
} from '@/modules/chat/models/chatMessageDisplay'

const messages = [
  { sender: { id: 'a' }, createdAt: '2026-11-17T08:00:00.000Z' },
  { sender: { id: 'a' }, createdAt: '2026-11-17T08:01:00.000Z' },
  { sender: { id: 'b' }, createdAt: '2026-11-17T08:02:00.000Z' },
  { sender: { id: 'b' }, createdAt: '2026-11-18T08:03:00.000Z' },
]

describe('chat message display grouping', () => {
  it('shows the date only at the start of each local calendar day', () => {
    expect(startsMessageDate(messages, 0)).toBe(true)
    expect(startsMessageDate(messages, 1)).toBe(false)
    expect(startsMessageDate(messages, 3)).toBe(true)
  })

  it('shows sender details first and time last in each consecutive run', () => {
    expect(startsMessageRun(messages, 0)).toBe(true)
    expect(startsMessageRun(messages, 1)).toBe(false)
    expect(endsMessageRun(messages, 0)).toBe(false)
    expect(endsMessageRun(messages, 1)).toBe(true)
    expect(startsMessageRun(messages, 3)).toBe(true)
    expect(endsMessageRun(messages, 3)).toBe(true)
  })

  it('formats Vietnamese and English date headings and time-only labels', () => {
    const value = '2026-11-18T08:05:00.000Z'
    expect(formatMessageDate(value, 'VI')).toContain('ngày')
    expect(formatMessageDate(value, 'EN')).toContain('2026')
    expect(formatMessageTime(value)).toMatch(/^\d{2}:\d{2}$/u)
  })
})
