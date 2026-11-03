export const NOTE_DEFAULT_TITLE = 'Ghi chú không tiêu đề'
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

export const NOTE_BACKGROUND_VALUES = ['default', 'blue', 'mint', 'yellow', 'rose', 'lavender'] as const
export type NoteBackground = (typeof NOTE_BACKGROUND_VALUES)[number]

export const NOTE_BACKGROUND_OPTIONS: readonly {
  value: NoteBackground
  label: string
  editorClass: string
  cardClass: string
  swatchClass: string
}[] = [
  { value: 'default', label: 'Mặc định', editorClass: 'bg-white/90 dark:bg-palette-900/70', cardClass: 'bg-white/85 dark:bg-palette-900/65', swatchClass: 'bg-white dark:bg-palette-900' },
  { value: 'blue', label: 'Xanh lam', editorClass: 'bg-[#e4f3ff] dark:bg-[#123866]', cardClass: 'bg-[#e4f3ff] dark:bg-[#123866]', swatchClass: 'bg-[#c1e8ff]' },
  { value: 'mint', label: 'Xanh bạc hà', editorClass: 'bg-[#e2f4ef] dark:bg-[#174b49]', cardClass: 'bg-[#e2f4ef] dark:bg-[#174b49]', swatchClass: 'bg-[#b8e2d8]' },
  { value: 'yellow', label: 'Vàng nhạt', editorClass: 'bg-[#fff4c7] dark:bg-[#5b4b1d]', cardClass: 'bg-[#fff4c7] dark:bg-[#5b4b1d]', swatchClass: 'bg-[#ffe58a]' },
  { value: 'rose', label: 'Hồng nhạt', editorClass: 'bg-[#ffe8ed] dark:bg-[#5c2b3b]', cardClass: 'bg-[#ffe8ed] dark:bg-[#5c2b3b]', swatchClass: 'bg-[#ffc4d0]' },
  { value: 'lavender', label: 'Tím nhạt', editorClass: 'bg-[#eee9ff] dark:bg-[#3f3565]', cardClass: 'bg-[#eee9ff] dark:bg-[#3f3565]', swatchClass: 'bg-[#d9ceff]' },
]

export const getNoteBackgroundOption = (value: NoteBackground) =>
  NOTE_BACKGROUND_OPTIONS.find((option) => option.value === value) ?? NOTE_BACKGROUND_OPTIONS[0]!
