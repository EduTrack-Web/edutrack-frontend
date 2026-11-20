export const CHAT_MESSAGE_TEXT_MAX_LENGTH = 5_000

export const countChatMessageCharacters = (value: string): number => Array.from(value).length

export const validateChatMessageContent = (value: string): string | null => {
  const content = value.trim()
  if (!content) return 'Vui lòng nhập nội dung tin nhắn.'
  if (countChatMessageCharacters(content) > CHAT_MESSAGE_TEXT_MAX_LENGTH) {
    return `Nội dung tin nhắn không được vượt quá ${CHAT_MESSAGE_TEXT_MAX_LENGTH.toLocaleString('vi-VN')} ký tự.`
  }
  return null
}
