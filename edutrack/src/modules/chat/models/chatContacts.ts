import type { ChatUserSummary } from '@/modules/chat/models/chat.types'

export interface ChatContactSection {
  initial: string
  users: ChatUserSummary[]
}

const normalizeInitial = (fullName: string): string => {
  const firstCharacter = fullName.trim().charAt(0)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[đĐ]/g, 'D')
    .toUpperCase()

  return /^[A-Z]$/.test(firstCharacter) ? firstCharacter : '#'
}

export const sortChatContacts = <T extends ChatUserSummary>(users: T[]): T[] =>
  [...users].sort((left, right) => {
    const byName = left.fullName.localeCompare(right.fullName, 'vi', { sensitivity: 'base' })
    return byName !== 0 ? byName : left.username.localeCompare(right.username, 'vi')
  })

export const groupChatContacts = (users: ChatUserSummary[]): ChatContactSection[] => {
  const sections = new Map<string, ChatUserSummary[]>()

  sortChatContacts(users).forEach((user) => {
    const initial = normalizeInitial(user.fullName)
    sections.set(initial, [...(sections.get(initial) ?? []), user])
  })

  return [...sections.entries()]
    .sort(([left], [right]) => {
      if (left === '#') return 1
      if (right === '#') return -1
      return left.localeCompare(right, 'en')
    })
    .map(([initial, sectionUsers]) => ({ initial, users: sectionUsers }))
}
