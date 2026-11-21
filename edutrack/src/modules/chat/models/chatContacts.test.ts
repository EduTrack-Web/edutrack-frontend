import { describe, expect, it } from 'vitest'

import { groupChatContacts } from '@/modules/chat/models/chatContacts'
import type { ChatUserSummary } from '@/modules/chat/models/chat.types'

const user = (id: string, fullName: string): ChatUserSummary => ({
  id,
  fullName,
  username: id,
})

describe('groupChatContacts', () => {
  it('sắp xếp danh bạ theo tên và gom theo chữ cái không dấu', () => {
    const sections = groupChatContacts([
      user('tran', 'Trần Văn Minh'),
      user('dang', 'Đặng Thị Ngọc'),
      user('le', 'Lê Thị Mai'),
    ])

    expect(sections.map((section) => section.initial)).toEqual(['D', 'L', 'T'])
    expect(sections.flatMap((section) => section.users.map((item) => item.id))).toEqual(['dang', 'le', 'tran'])
  })

  it('đưa tên không bắt đầu bằng chữ cái vào nhóm khác', () => {
    expect(groupChatContacts([user('number', '123 User')])[0]?.initial).toBe('#')
  })
})
