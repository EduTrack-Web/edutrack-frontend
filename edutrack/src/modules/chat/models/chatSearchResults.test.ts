import { describe, expect, it } from 'vitest'

import type {
  DirectConversationSummary,
  FriendSearchResult,
} from '@/modules/chat/models/chat.types'
import { removeAccountsDuplicatedByMatchedConversations } from '@/modules/chat/models/chatSearchResults'

const friend: FriendSearchResult = {
  id: 'friend-id',
  fullName: 'Nguyễn Thị Hương',
  username: 'nguyen-thi-huong-1234',
  relation: 'friend',
  exactMatch: true,
}

const conversation: DirectConversationSummary = {
  id: 'conversation-id',
  participant: {
    id: friend.id,
    fullName: friend.fullName,
    username: friend.username,
    isOnline: false,
  },
  createdAt: '2026-11-01T00:00:00.000Z',
  updatedAt: '2026-11-01T00:00:00.000Z',
}

describe('removeAccountsDuplicatedByMatchedConversations', () => {
  it('keeps an email account match when the conversation name did not match', () => {
    expect(removeAccountsDuplicatedByMatchedConversations([friend], [])).toEqual([friend])
  })

  it('removes only an account already represented by a matched conversation', () => {
    expect(removeAccountsDuplicatedByMatchedConversations([friend], [conversation])).toEqual([])
  })
})
