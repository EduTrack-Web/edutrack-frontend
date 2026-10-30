import { useEffect, useRef } from 'react'
import { Link, useSearchParams } from 'react-router-dom'

import { Icon } from '../../../shared/components/Icon'
import { AuthCard } from '../components/AuthCard'
import { FormField } from '../components/FormField'
import { GoogleAuthButton } from '../components/GoogleAuthButton'
import { OtpResendButton } from '../components/OtpResendButton'
import { useLoginViewModel } from '../viewmodels/useLoginViewModel'
import { useToast } from '../../../shared/viewmodels/useToast'

export function LoginPage() {
  const vm = useLoginViewModel()
  const { showToast } = useToast()
  const oauthHandled = useRef(false)
  const [searchParams] = useSearchParams()
  const oauthError = searchParams.get('oauthError')
  const oauthMessage = oauthError === 'GOOGLE_LINK_REQUIRED'
    ? 'Email này đã có tài khoản EduTrack. Vui lòng đăng nhập bằng mật khẩu, sau đó liên kết Google trong trang tài khoản.'
    : oauthError === 'GOOGLE_ACCESS_DENIED'
      ? 'Bạn đã hủy hoặc từ chối đăng nhập bằng Google.'
      : oauthError
        ? 'Không thể đăng nhập bằng Google lúc này. Vui lòng thử lại.'
        : undefined
  useEffect(() => {
    if (oauthMessage && !oauthHandled.current) {
      oauthHandled.current = true
      showToast(oauthMessage, oauthError === 'GOOGLE_LINK_REQUIRED' ? 'warning' : 'error')
    }
  }, [oauthError, oauthMessage, showToast])
  return (
    <AuthCard title="Chào mừng trở lại" description={vm.otpMode ? 'Nhập mã OTP 6 số đã được gửi đến email của bạn.' : 'Đăng nhập để tiếp tục hành trình học tập cùng EduTrack.'} footer={<>Chưa có tài khoản? <Link className="font-bold text-palette-700 hover:underline dark:text-palette-200" to="/register">Tạo tài khoản mới</Link></>}>
      <form className="space-y-4" noValidate onSubmit={(event) => void vm.submit(event)}>
        {vm.otpMode ? <><FormField id="otp" label="Mã OTP" inputMode="numeric" maxLength={6} autoComplete="one-time-code" value={vm.otp} error={vm.fieldErrors.otp} onChange={(event) => vm.setOtp(event.target.value.replace(/\D/g, ''))} />{vm.otpId && <OtpResendButton otpId={vm.otpId} purpose={vm.otpMode === 'two-factor' ? 'login-2fa' : 'registration'} onResent={vm.setOtpId} />}</> : <><FormField id="identifier" label="Username hoặc email" autoComplete="username" value={vm.identifier} error={vm.fieldErrors.identifier} onChange={(event) => vm.setIdentifier(event.target.value)} /><FormField id="password" label="Mật khẩu" type="password" autoComplete="current-password" value={vm.password} error={vm.fieldErrors.password} onChange={(event) => vm.setPassword(event.target.value)} /><div className="text-right"><Link className="text-sm font-bold text-palette-700 hover:underline dark:text-palette-200" to="/forgot-password">Quên mật khẩu?</Link></div></>}
        <button className="primary-button w-full" disabled={vm.isSubmitting} type="submit">{vm.isSubmitting ? 'Đang xử lý…' : vm.otpMode ? 'Xác nhận OTP' : 'Đăng nhập'}<Icon name="arrowRight" /></button>
      </form>
      {!vm.otpMode && <><div className="my-6 flex items-center gap-3 text-xs text-slate-400"><span className="h-px flex-1 bg-palette-200 dark:bg-white/10" />hoặc<span className="h-px flex-1 bg-palette-200 dark:bg-white/10" /></div><GoogleAuthButton mode="login" /></>}
    </AuthCard>
  )
}
