import type { DashboardOverview } from '../models/DashboardOverview'

const overview: DashboardOverview = {
  title: 'Chào mừng đến với EduTrack',
  description: 'Nền tảng giúp bạn tổ chức lịch trình, ghi chú và trao đổi nhóm trong cùng một không gian.',
  modules: [
    { name: 'Lịch trình', description: 'Quản lý sự kiện, deadline và lời nhắc học tập.' },
    { name: 'Ghi chú', description: 'Lưu giữ và kết nối kiến thức với công việc.' },
    { name: 'Trao đổi nhóm', description: 'Phối hợp cùng bạn học theo thời gian thực.' },
  ],
}

export function useDashboardViewModel(): DashboardOverview { return overview }
