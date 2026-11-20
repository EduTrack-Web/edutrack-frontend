import { describe, expect, it } from 'vitest'

import {
  countChatMessageCharacters,
  validateChatMessageContent,
} from '@/modules/chat/models/chatMessageValidation'

describe('chat message validation', () => {
  it('rejects empty content after trimming', () => {
    expect(validateChatMessageContent('  \n  ')).toBe('Vui lòng nhập nội dung tin nhắn.')
  })

  it('counts emoji as one character and accepts exactly 5000 characters', () => {
    const content = '😀'.repeat(5_000)
    expect(countChatMessageCharacters(content)).toBe(5_000)
    expect(validateChatMessageContent(content)).toBeNull()
  })

  it('rejects content longer than 5000 Unicode characters', () => {
    expect(validateChatMessageContent('đ'.repeat(5_001))).toContain('5.000')
  })
})
