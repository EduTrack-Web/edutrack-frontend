import { authApi } from '../services/authApi'

interface GoogleAuthButtonProps { mode: 'login' | 'register' }

export function GoogleAuthButton({ mode }: GoogleAuthButtonProps) {
  return <a className="google-auth-button" href={authApi.googleLoginUrl}><img alt="" className="size-5" src="/google-g-logo.png" />{mode === 'login' ? 'Đăng nhập bằng Google' : 'Đăng ký bằng Google'}</a>
}
