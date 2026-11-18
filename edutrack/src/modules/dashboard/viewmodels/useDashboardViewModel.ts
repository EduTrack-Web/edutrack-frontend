import type { DashboardOverview } from '@/modules/dashboard/models/DashboardOverview'

const overviewData: DashboardOverview = {
  title: 'Tổng quan học tập',
  description: 'Theo dõi toàn diện thời khóa biểu hôm nay, hạn chót deadline và tiến độ các ghi chú học phần.',
  stats: [
    {
      label: 'Lịch trình hôm nay',
      value: '03 Sự kiện',
      subtext: 'Tiết học kế tiếp lúc 13:30',
      icon: 'calendar',
      badge: 'Hôm nay',
    },
    {
      label: 'Deadline sắp tới',
      value: '02 Hạn nộp',
      subtext: 'Gần nhất: 23:59 hôm nay',
      icon: 'clock',
      badge: 'Gấp',
    },
    {
      label: 'Ghi chú tuần này',
      value: '14 Bài ghi',
      subtext: '+3 bài so với tuần trước',
      icon: 'notes',
      badge: '+25%',
    },
    {
      label: 'Mục tiêu học kỳ',
      value: '85% Tiến độ',
      subtext: 'Đang duy trì phong độ tốt',
      icon: 'trendUp',
      badge: 'Xuất sắc',
    },
  ],
  upcomingEvents: [
    {
      id: '1',
      title: 'Công nghệ phần mềm nâng cao',
      time: '13:30 - 16:00',
      location: 'Phòng A3-205',
      type: 'class',
    },
    {
      id: '2',
      title: 'Hạn nộp Báo cáo đồ án tuần 8',
      time: 'Trước 23:59',
      location: 'Hệ thống LMS',
      type: 'deadline',
    },
    {
      id: '3',
      title: 'Họp nhóm đồ án tốt nghiệp',
      time: '19:30 - 20:30',
      location: 'Kênh chat EduTrack',
      type: 'class',
    },
  ],
  recentNotes: [
    {
      id: '1',
      title: 'Kiến trúc MVVM và quy tắc phân tầng',
      subject: 'Công nghệ phần mềm',
      timeAgo: '2 giờ trước',
    },
    {
      id: '2',
      title: 'Tối ưu hóa truy vấn MongoDB & Indexing',
      subject: 'Cơ sở dữ liệu nâng cao',
      timeAgo: 'Hôm qua',
    },
    {
      id: '3',
      title: 'Giao thức bảo mật Double Submit CSRF',
      subject: 'An toàn bảo mật hệ thống',
      timeAgo: '3 ngày trước',
    },
  ],
  modules: [
    {
      name: 'Lịch trình & Lời nhắc',
      description: 'Quản lý thời khóa biểu, lịch thi, deadline và nhắc nhở học tập trực quan theo tuần/tháng.',
      path: '/calendar',
      icon: 'calendar',
      tag: 'Lịch trình',
    },
    {
      name: 'Ghi chú học tập',
      description: 'Soạn thảo kiến thức theo môn học, gắn thẻ tag và kết nối trực tiếp với sự kiện học tập.',
      path: '/notes',
      icon: 'notes',
      tag: 'Sổ tay ghi chú',
    },
    {
      name: 'Trao đổi & Cộng tác',
      description: 'Thảo luận môn học, phòng chat nhóm bài tập lớn theo thời gian thực mượt mà.',
      path: '/chat',
      icon: 'chat',
      tag: 'Kênh trao đổi',
    },
  ],
}

export function useDashboardViewModel(): DashboardOverview {
  return overviewData
}
