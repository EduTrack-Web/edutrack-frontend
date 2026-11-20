import { describe, expect, it } from 'vitest'

import { validateChatSearchQuery } from '@/modules/chat/models/chatSearchValidation'

describe('validateChatSearchQuery', () => {
  it('accepts valid email and username identifiers', () => {
    expect(validateChatSearchQuery(' Student-1234 ')).toMatchObject({
      query: 'Student-1234',
      error: null,
      canSearchAccount: true,
    })
    expect(validateChatSearchQuery('student_1234')).toMatchObject({
      error: null,
      canSearchAccount: true,
    })
    expect(validateChatSearchQuery('student@example.com')).toMatchObject({
      error: null,
      canSearchAccount: true,
    })
  })

  it('reports malformed email next to the search field', () => {
    expect(validateChatSearchQuery('student@example')).toMatchObject({
      error: 'Email không đúng định dạng. Ví dụ: ten@example.com.',
      canSearchAccount: false,
    })
  })

  it('allows general keywords without treating them as account identifiers', () => {
    expect(validateChatSearchQuery('bài tập tuần này')).toMatchObject({
      error: null,
      canSearchAccount: false,
    })
  })
})
