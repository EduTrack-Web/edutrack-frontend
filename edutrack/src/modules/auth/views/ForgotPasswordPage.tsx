import { Link } from 'react-router-dom'

import { Icon } from '../../../shared/components/Icon'
import { AuthCard } from '../components/AuthCard'
import { FormField } from '../components/FormField'
import { OtpResendButton } from '../components/OtpResendButton'
import { useForgotPasswordViewModel } from '../viewmodels/useForgotPasswordViewModel'

export function ForgotPasswordPage() {
  const vm = useForgotPasswordViewModel()
  return (
    <AuthCard
      title="Quên mật khẩu"
      description={vm.otpId ? 'Nhập OTP và đặt mật khẩu mới cho tài khoản.' : 'Nhập email đã đăng ký để nhận mã đặt lại mật khẩu.'}
      footer={<Link className="font-bold text-palette-700 hover:underline dark:text-palette-200" to="/login">Quay lại đăng nhập</Link>}
    >
      {vm.complete ? (
        <div className="text-center">
          <span className="mx-auto grid size-16 place-items-center rounded-full bg-emerald-100 text-emerald-700"><Icon className="size-8" name="check" /></span>
          <p className="mt-5 font-bold text-palette-950 dark:text-white">{vm.message}</p>
          <Link className="primary-button mt-6 w-full" to="/login">Đăng nhập ngay<Icon name="arrowRight" /></Link>
        </div>
      ) : (
        <form className="space-y-4" noValidate onSubmit={(event) => void vm.submit(event)}>
          {vm.otpId ? (
            <>
              <FormField id="otp" label="Mã OTP" inputMode="numeric" maxLength={6} value={vm.code} error={vm.fieldErrors.otp} onChange={(event) => vm.setCode(event.target.value.replace(/\D/g, ''))} />
              <OtpResendButton otpId={vm.otpId} purpose="password-reset" onResent={vm.setOtpId} />
              <FormField id="newPassword" label="Mật khẩu mới" type="password" value={vm.newPassword} error={vm.fieldErrors.newPassword} onChange={(event) => vm.setNewPassword(event.target.value)} />
              <FormField id="confirmPassword" label="Xác nhận mật khẩu mới" type="password" value={vm.confirmPassword} error={vm.fieldErrors.confirmPassword} onChange={(event) => vm.setConfirmPassword(event.target.value)} />
            </>
          ) : (
            <FormField id="email" label="Email" type="email" autoComplete="email" value={vm.email} error={vm.fieldErrors.email} onChange={(event) => vm.setEmail(event.target.value)} />
          )}
          <button className="primary-button w-full" disabled={vm.isSubmitting} type="submit">
            {vm.isSubmitting ? 'Đang xử lý…' : vm.otpId ? 'Đặt lại mật khẩu' : 'Gửi mã OTP'}<Icon name="arrowRight" />
          </button>
        </form>
      )}
    </AuthCard>
  )
}
