import { Link } from 'react-router-dom'

import { Icon } from '../../../shared/components/Icon'
import { AuthCard } from '../components/AuthCard'
import { FormField } from '../components/FormField'
import { GoogleAuthButton } from '../components/GoogleAuthButton'
import { OtpResendButton } from '../components/OtpResendButton'
import { useRegisterViewModel } from '../viewmodels/useRegisterViewModel'

export function RegisterPage() {
  const vm = useRegisterViewModel()
  return (
    <AuthCard title={vm.otpId ? 'Xác minh email' : 'Tạo tài khoản'} description={vm.otpId ? 'Nhập mã OTP 6 số được gửi đến email. Mã có hiệu lực trong 10 phút.' : 'Vui lòng nhập đúng địa chỉ email của bạn để nhận mã xác minh.'} footer={<>Đã có tài khoản? <Link className="font-bold text-palette-700 hover:underline dark:text-palette-200" to="/login">Đăng nhập</Link></>}>
      <form className="space-y-3" noValidate onSubmit={(event) => void vm.submit(event)}>
        {vm.otpId ? <><FormField id="otp" label="Mã OTP" inputMode="numeric" maxLength={6} autoComplete="one-time-code" value={vm.otp} error={vm.fieldErrors.otp} onChange={(event) => vm.setOtp(event.target.value.replace(/\D/g, ''))} /><OtpResendButton otpId={vm.otpId} purpose="registration" onResent={vm.setOtpId} /></> : <><FormField id="fullName" label="Họ và tên" autoComplete="name" value={vm.form.fullName} error={vm.fieldErrors.fullName} onChange={(event) => vm.update('fullName', event.target.value)} /><FormField id="email" label="Email" type="email" autoComplete="email" value={vm.form.email} error={vm.fieldErrors.email} onChange={(event) => vm.update('email', event.target.value)} /><FormField id="password" label="Mật khẩu" type="password" autoComplete="new-password" value={vm.form.password} error={vm.fieldErrors.password} onChange={(event) => vm.update('password', event.target.value)} /><FormField id="confirmPassword" label="Xác nhận mật khẩu" type="password" autoComplete="new-password" value={vm.form.confirmPassword} error={vm.fieldErrors.confirmPassword} onChange={(event) => vm.update('confirmPassword', event.target.value)} /><p className="text-xs leading-5 text-slate-500 dark:text-slate-400">8–64 ký tự, gồm chữ hoa, chữ thường, số, ký tự đặc biệt và không có khoảng trắng.</p></>}
        <button className="primary-button w-full" disabled={vm.isSubmitting} type="submit">{vm.isSubmitting ? 'Đang xử lý…' : vm.otpId ? 'Xác minh tài khoản' : 'Đăng ký'}<Icon className="size-5 shrink-0" name="arrowRight" /></button>
      </form>
      {!vm.otpId && <><div className="my-4 flex items-center gap-3 text-xs text-slate-400"><span className="h-px flex-1 bg-palette-200 dark:bg-white/10" />hoặc<span className="h-px flex-1 bg-palette-200 dark:bg-white/10" /></div><GoogleAuthButton mode="register" /></>}
    </AuthCard>
  )
}
