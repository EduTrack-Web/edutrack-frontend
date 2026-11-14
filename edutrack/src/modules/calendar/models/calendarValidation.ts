import type { CreateCategoryInput, CreateEventInput } from './calendar.types'

const HEX_COLOR_REGEX = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/

const isValidUrl = (url: string): boolean => {
  try {
    const parsed = new URL(url)
    return parsed.protocol === 'http:' || parsed.protocol === 'https:'
  } catch {
    return false
  }
}

export const validateEventForm = (input: Partial<CreateEventInput>): Record<string, string> => {
  const errors: Record<string, string> = {}

  const title = input.title?.trim() ?? ''
  if (!title) {
    errors.title = 'Vui lòng nhập tiêu đề'
  } else if (title.length > 150) {
    errors.title = 'Tiêu đề không được vượt quá 150 ký tự'
  }

  const startDate = input.startDate?.trim() ?? ''
  const parsedStart = startDate ? new Date(startDate) : null
  if (!startDate || !parsedStart || Number.isNaN(parsedStart.getTime())) {
    errors.startDate = 'Vui lòng chọn thời gian hợp lệ'
  }

  const endDate = input.endDate?.trim() ?? ''
  const parsedEnd = endDate ? new Date(endDate) : null
  if (!endDate || !parsedEnd || Number.isNaN(parsedEnd.getTime())) {
    errors.endDate = 'Vui lòng chọn thời gian kết thúc / hạn chót hợp lệ'
  }

  if (parsedStart && parsedEnd && !Number.isNaN(parsedStart.getTime()) && !Number.isNaN(parsedEnd.getTime())) {
    if (parsedEnd < parsedStart) {
      errors.endDate = 'Thời gian kết thúc không được sớm hơn thời gian bắt đầu'
    }
  }

  if (input.description && input.description.length > 2000) {
    errors.description = 'Nội dung mô tả không được vượt quá 2000 ký tự'
  }

  if (input.location && input.location.length > 200) {
    errors.location = 'Địa điểm không được vượt quá 200 ký tự'
  }

  if (input.onlineMeetingUrl && input.onlineMeetingUrl.trim() && !isValidUrl(input.onlineMeetingUrl.trim())) {
    errors.onlineMeetingUrl = 'Link họp trực tuyến không đúng định dạng URL'
  }

  if (input.submissionUrl && input.submissionUrl.trim() && !isValidUrl(input.submissionUrl.trim())) {
    errors.submissionUrl = 'Link nộp bài / tài liệu không đúng định dạng URL'
  }

  if (input.color && input.color.trim() && !HEX_COLOR_REGEX.test(input.color.trim())) {
    errors.color = 'Mã màu HEX không hợp lệ (ví dụ: #2563EB)'
  }

  return errors
}

export const validateCategoryForm = (input: Partial<CreateCategoryInput>): Record<string, string> => {
  const errors: Record<string, string> = {}

  const name = input.name?.trim() ?? ''
  if (!name) {
    errors.name = 'Vui lòng nhập tên lịch'
  } else if (name.length > 100) {
    errors.name = 'Tên lịch không được vượt quá 100 ký tự'
  }

  if (input.color && input.color.trim() && !HEX_COLOR_REGEX.test(input.color.trim())) {
    errors.color = 'Mã màu HEX không hợp lệ (ví dụ: #2563EB)'
  }

  if (input.description && input.description.trim().length > 500) {
    errors.description = 'Mô tả không được vượt quá 500 ký tự'
  }

  return errors
}
