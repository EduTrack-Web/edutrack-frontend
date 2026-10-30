# EduTrack Frontend

Frontend React, TypeScript và Tailwind CSS, tổ chức theo MVVM và module nghiệp vụ.

## Cấu hình local

1. Sao chép `.env.example` thành `.env`.
2. Đặt `VITE_API_BASE_URL=http://localhost:8888/v1/api` hoặc URL backend tương ứng.
3. Chạy `npm run dev`.

Frontend gửi cookie bằng `credentials: include`; backend phải cho phép đúng frontend origin.

## Core hiện có

- Layout khách với logo, bộ chọn ngôn ngữ, dark/light mode và đăng nhập.
- Layout đã đăng nhập với sidebar mở/thu gọn và responsive mobile.
- Đăng nhập username/email, OTP hai bước, Google OAuth.
- Đăng ký và xác minh OTP.
- Quên/đặt lại mật khẩu.
- API client dùng CSRF token và HttpOnly auth cookie.

## Scripts

- `npm run dev`: Vite development server.
- `npm run lint`: ESLint.
- `npm run build`: typecheck và production build.
- `npm run preview`: xem production build tại local.
