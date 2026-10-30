const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const passwordPattern = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9])\S{8,64}$/

export type FieldErrors = Readonly<Record<string, string>>

const requiredMessage = (label: string) => `Vui lòng nhập ${label}.`

export function validateLogin(identifier: string, password: string): FieldErrors {
  const errors: Record<string, string> = {}
  if (!identifier.trim()) errors.identifier = requiredMessage('username hoặc email')
  if (!password) errors.password = requiredMessage('mật khẩu')
  return errors
}

export function validateRegistration(form: {
  fullName: string
  email: string
  password: string
  confirmPassword: string
}): FieldErrors {
  const errors: Record<string, string> = {}
  const fullName = form.fullName.trim()
  const email = form.email.trim()

  if (!fullName) errors.fullName = requiredMessage('họ và tên')
  else if (fullName.length < 2 || fullName.length > 50) errors.fullName = 'Họ và tên phải dài từ 2 đến 50 ký tự.'

  if (!email) errors.email = requiredMessage('email')
  else if (!emailPattern.test(email) || email.length > 254) errors.email = 'Email không hợp lệ. Ví dụ: ten@example.com.'

  if (!form.password) errors.password = requiredMessage('mật khẩu')
  else if (!passwordPattern.test(form.password)) {
    errors.password = 'Mật khẩu phải dài 8–64 ký tự, có chữ hoa, chữ thường, số, ký tự đặc biệt và không có khoảng trắng.'
  }

  if (!form.confirmPassword) errors.confirmPassword = requiredMessage('xác nhận mật khẩu')
  else if (form.password !== form.confirmPassword) errors.confirmPassword = 'Mật khẩu xác nhận không khớp.'
  return errors
}

export function validateEmail(emailInput: string): FieldErrors {
  const email = emailInput.trim()
  if (!email) return { email: requiredMessage('email') }
  if (!emailPattern.test(email) || email.length > 254) return { email: 'Email không hợp lệ. Ví dụ: ten@example.com.' }
  return {}
}

export function validateOtp(code: string): FieldErrors {
  return /^\d{6}$/.test(code) ? {} : { otp: 'Mã OTP phải gồm đúng 6 chữ số.' }
}

export function validatePasswordReset(code: string, password: string, confirmPassword: string): FieldErrors {
  const errors: Record<string, string> = { ...validateOtp(code) }
  if (!password) errors.newPassword = requiredMessage('mật khẩu mới')
  else if (!passwordPattern.test(password)) {
    errors.newPassword = 'Mật khẩu phải dài 8–64 ký tự, có chữ hoa, chữ thường, số, ký tự đặc biệt và không có khoảng trắng.'
  }
  if (!confirmPassword) errors.confirmPassword = requiredMessage('xác nhận mật khẩu')
  else if (password !== confirmPassword) errors.confirmPassword = 'Mật khẩu xác nhận không khớp.'
  return errors
}
