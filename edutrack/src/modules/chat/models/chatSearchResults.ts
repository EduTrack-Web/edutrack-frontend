import type {
  DirectConversationSummary,
  FriendSearchResult,
} from '@/modules/chat/models/chat.types'

export const removeAccountsDuplicatedByMatchedConversations = (
  accounts: FriendSearchResult[],
  matchedConversations: DirectConversationSummary[],
): FriendSearchResult[] => {
  const matchedParticipantIds = new Set(
    matchedConversations.map((conversation) => conversation.participant.id),
  )
  return accounts.filter((account) => !matchedParticipantIds.has(account.id))
}
