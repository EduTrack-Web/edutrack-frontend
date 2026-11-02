export const NOTE_TITLE_MAX_LENGTH = 200
export const NOTE_AUTOSAVE_INTERVAL_MS = 5_000

export const NOTE_IMAGE_MAX_SIZE_MB = 5
export const NOTE_IMAGE_MAX_SIZE_BYTES = NOTE_IMAGE_MAX_SIZE_MB * 1024 * 1024
export const NOTE_IMAGE_ACCEPTED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const
export const NOTE_IMAGE_FILE_ACCEPT = NOTE_IMAGE_ACCEPTED_MIME_TYPES.join(',')

export const NOTE_IMAGE_ERROR_MESSAGES = {
  tooLarge: `Dung lượng ảnh không được vượt quá ${NOTE_IMAGE_MAX_SIZE_MB} MB.`,
  unsupportedType: 'Ảnh phải có định dạng JPEG, PNG hoặc WebP.',
} as const

export const validateNoteImageFile = (file: File): string | undefined => {
  if (file.size > NOTE_IMAGE_MAX_SIZE_BYTES) return NOTE_IMAGE_ERROR_MESSAGES.tooLarge
  if (!NOTE_IMAGE_ACCEPTED_MIME_TYPES.includes(file.type as (typeof NOTE_IMAGE_ACCEPTED_MIME_TYPES)[number])) {
    return NOTE_IMAGE_ERROR_MESSAGES.unsupportedType
  }
  return undefined
}
