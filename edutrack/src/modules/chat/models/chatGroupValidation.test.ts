import { describe, expect, it } from 'vitest'

import { validateChatGroupForm } from '@/modules/chat/models/chatGroupValidation'

describe('validateChatGroupForm', () => {
  it('returns every field error in one validation pass', () => {
    const errors = validateChatGroupForm({
      name: 'A',
      description: 'x'.repeat(501),
      participantIds: ['one'],
    })

    expect(errors.name).toBeDefined()
    expect(errors.description).toBeDefined()
    expect(errors.participantIds).toBeDefined()
  })

  it('accepts a group with two distinct selected users', () => {
    expect(validateChatGroupForm({
      name: 'Nhóm học tập',
      description: '',
      participantIds: ['one', 'two'],
    })).toEqual({})
  })
})
