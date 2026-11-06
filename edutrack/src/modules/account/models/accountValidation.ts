export const USERNAME_REGEX = /^[a-z0-9_-]{3,30}$/
export const VIETNAMESE_ACCENT_REGEX = /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđĐ]/
export const VIETNAM_PHONE_REGEX = /^(0[3|5|7|8|9])[0-9]{8}$/
export const PASSWORD_PATTERN = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9])\S{8,64}$/

export type AccountFieldErrors = Readonly<Record<string, string>>

/**
 * Kiểm tra định dạng tên đăng nhập (Username).
 * Báo lỗi cụ thể, chuẩn mực cho từng trường hợp vi phạm.
 */
export function validateUsernameFormat(username: string): string | null {
  const trimmed = username.trim()
  if (!trimmed) {
    return 'Tên đăng nhập không được để trống.'
  }

  const hasSpace = /\s/.test(username)
  const hasAccent = VIETNAMESE_ACCENT_REGEX.test(username)

  if (hasSpace && hasAccent) {
    return 'Tên đăng nhập không được chứa khoảng trắng và dấu tiếng Việt.'
  }

  if (hasSpace) {
    return 'Tên đăng nhập không được chứa khoảng trắng.'
  }

  if (hasAccent) {
    return 'Tên đăng nhập không được chứa dấu tiếng Việt.'
  }

  if (trimmed.length < 3 || trimmed.length > 30) {
    return 'Tên đăng nhập phải có độ dài từ 3 đến 30 ký tự.'
  }

  if (!/^[a-zA-Z0-9_-]+$/.test(trimmed)) {
    return 'Tên đăng nhập chỉ gồm chữ cái không dấu, chữ số (0-9), gạch ngang (-) hoặc gạch dưới (_).'
  }

  return null
}

export interface ProfileFormData {
  fullName: string
  username: string
  phone?: string
  organization?: string
  fieldOfStudy?: string
}

/**
 * Kiểm tra toàn bộ form hồ sơ cá nhân.
 */
export function validateProfileForm(form: ProfileFormData): AccountFieldErrors {
  const errors: Record<string, string> = {}

  // 1. Kiểm tra Họ và tên
  const trimmedName = form.fullName.trim()
  if (!trimmedName) {
    errors.fullName = 'Vui lòng nhập họ và tên.'
  } else if (trimmedName.length < 2 || trimmedName.length > 50) {
    errors.fullName = 'Họ và tên phải từ 2 đến 50 ký tự.'
  }

  // 2. Kiểm tra Tên đăng nhập
  const usernameError = validateUsernameFormat(form.username)
  if (usernameError) {
    errors.username = usernameError
  }

  // 3. Kiểm tra Số điện thoại (nếu có nhập)
  if (form.phone) {
    const trimmedPhone = form.phone.trim()
    if (trimmedPhone && !VIETNAM_PHONE_REGEX.test(trimmedPhone)) {
      errors.phone = 'Số điện thoại không hợp lệ. Vui lòng nhập 10 chữ số (ví dụ: 0912345678).'
    }
  }

  // 4. Kiểm tra Trường học / Đơn vị (nếu có nhập)
  if (form.organization) {
    const trimmedOrg = form.organization.trim()
    if (trimmedOrg.length > 100) {
      errors.organization = 'Tên trường học hoặc đơn vị không được vượt quá 100 ký tự.'
    }
  }

  // 5. Kiểm tra Lĩnh vực / Chuyên ngành (nếu có nhập)
  if (form.fieldOfStudy) {
    const trimmedField = form.fieldOfStudy.trim()
    if (trimmedField.length > 100) {
      errors.fieldOfStudy = 'Lĩnh vực hoặc chuyên ngành không được vượt quá 100 ký tự.'
    }
  }

  return errors
}

export interface ChangePasswordFormData {
  currentPassword?: string
  newPassword: string
  confirmPassword: string
}

/**
 * Kiểm tra toàn bộ form đổi mật khẩu.
 */
export function validateChangePasswordForm(
  form: ChangePasswordFormData,
  hasPassword = true,
): AccountFieldErrors {
  const errors: Record<string, string> = {}

  // 1. Kiểm tra mật khẩu hiện tại (nếu tài khoản đã có mật khẩu)
  if (hasPassword) {
    if (!form.currentPassword) {
      errors.currentPassword = 'Vui lòng nhập mật khẩu hiện tại.'
    }
  }

  // 2. Kiểm tra mật khẩu mới
  if (!form.newPassword) {
    errors.newPassword = 'Vui lòng nhập mật khẩu mới.'
  } else if (!PASSWORD_PATTERN.test(form.newPassword)) {
    errors.newPassword =
      'Mật khẩu phải dài 8–64 ký tự, có chữ hoa, chữ thường, số, ký tự đặc biệt và không có khoảng trắng.'
  } else if (hasPassword && form.currentPassword && form.newPassword === form.currentPassword) {
    errors.newPassword = 'Mật khẩu mới không được trùng với mật khẩu hiện tại.'
  }

  // 3. Kiểm tra xác nhận mật khẩu
  if (!form.confirmPassword) {
    errors.confirmPassword = 'Vui lòng nhập xác nhận mật khẩu mới.'
  } else if (form.confirmPassword !== form.newPassword) {
    errors.confirmPassword = 'Mật khẩu xác nhận không khớp.'
  }

  return errors
}
