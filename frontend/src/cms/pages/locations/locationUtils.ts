import type { LocationStatus } from '../../data'

export const locationStatusLabels: Record<LocationStatus, string> = {
  draft: 'Bản nháp',
  pending: 'Chờ duyệt',
  published: 'Đã xuất bản',
  rejected: 'Cần chỉnh sửa',
  archived: 'Đã tạm dừng',
}

export const locationCategories = [
  'Cà phê', 'Ẩm thực', 'Văn hóa', 'Nghệ thuật', 'Điểm tham quan',
  'Thủ công', 'Không gian làm việc', 'Bán lẻ', 'Khác',
]

export function formatCmsDate(value: string): string {
  const date = new Date(`${value}T00:00:00`)
  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(date)
}

export function formatCount(value: number): string {
  return new Intl.NumberFormat('vi-VN').format(value)
}
