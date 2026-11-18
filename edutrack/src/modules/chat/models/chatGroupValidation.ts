export const CHAT_GROUP_NAME_MIN_LENGTH = 3
export const CHAT_GROUP_NAME_MAX_LENGTH = 100
export const CHAT_GROUP_DESCRIPTION_MAX_LENGTH = 500
export const CHAT_GROUP_MIN_SELECTED_USERS = 2

export interface ChatGroupFormValues {
  name: string
  description: string
  participantIds: string[]
}

export const validateChatGroupForm = (
  values: ChatGroupFormValues,
): Readonly<Record<string, string>> => {
  const fieldErrors: Record<string, string> = {}
  const name = values.name.trim().replace(/\s+/gu, ' ')
  const description = values.description.trim().replace(/\s+/gu, ' ')
  if (name.length < CHAT_GROUP_NAME_MIN_LENGTH || name.length > CHAT_GROUP_NAME_MAX_LENGTH) {
    fieldErrors.name = `Tên nhóm phải có từ ${CHAT_GROUP_NAME_MIN_LENGTH} đến ${CHAT_GROUP_NAME_MAX_LENGTH} ký tự.`
  }
  if (description.length > CHAT_GROUP_DESCRIPTION_MAX_LENGTH) {
    fieldErrors.description = `Mô tả không được vượt quá ${CHAT_GROUP_DESCRIPTION_MAX_LENGTH} ký tự.`
  }
  if (new Set(values.participantIds).size < CHAT_GROUP_MIN_SELECTED_USERS) {
    fieldErrors.participantIds = `Vui lòng chọn ít nhất ${CHAT_GROUP_MIN_SELECTED_USERS} người khác.`
  }
  return fieldErrors
}
