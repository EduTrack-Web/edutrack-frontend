export const CHAT_SEARCH_QUERY_MAX_LENGTH = 254

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const usernamePattern = /^[a-z0-9_-]{3,30}$/

export interface ChatSearchValidationResult {
  query: string
  error: string | null
  canSearchAccount: boolean
}

export const validateChatSearchQuery = (value: string): ChatSearchValidationResult => {
  const query = value.trim()
  if (!query) return { query, error: null, canSearchAccount: false }
  if (query.length > CHAT_SEARCH_QUERY_MAX_LENGTH) {
    return {
      query,
      error: `Từ khóa không được vượt quá ${CHAT_SEARCH_QUERY_MAX_LENGTH} ký tự.`,
      canSearchAccount: false,
    }
  }
  if (query.includes('@')) {
    return emailPattern.test(query)
      ? { query, error: null, canSearchAccount: true }
      : {
        query,
        error: 'Email không đúng định dạng. Ví dụ: ten@example.com.',
        canSearchAccount: false,
      }
  }
  const normalizedUsername = query.toLocaleLowerCase('vi')
  return {
    query,
    error: null,
    canSearchAccount: usernamePattern.test(normalizedUsername),
  }
}
