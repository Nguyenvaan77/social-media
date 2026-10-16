import type { CampaignStatus, KioskCampaign, Location } from '../../data/types'

export const campaignStatusLabel: Record<CampaignStatus, string> = {
  draft: 'Bản nháp',
  pending: 'Chờ duyệt',
  scheduled: 'Đã lên lịch',
  active: 'Đang phát',
  paused: 'Tạm dừng',
  completed: 'Đã kết thúc',
  rejected: 'Từ chối',
}

export function formatCampaignDate(value: string): string {
  if (!value) return '—'
  const parts = value.slice(0, 10).split('-')
  return parts.length === 3 ? `${parts[2]}/${parts[1]}/${parts[0]}` : value
}

export function formatCampaignMoney(value: number): string {
  return new Intl.NumberFormat('vi-VN').format(value) + ' ₫'
}

export function formatCampaignNumber(value: number): string {
  return new Intl.NumberFormat('vi-VN').format(value)
}

export function campaignApproval(status: CampaignStatus): 'approved' | 'pending' | 'rejected' {
  if (status === 'rejected') return 'rejected'
  if (status === 'pending' || status === 'draft') return 'pending'
  return 'approved'
}

export function campaignPayment(status: CampaignStatus): 'paid' | 'pending' | 'failed' {
  if (status === 'rejected') return 'failed'
  if (status === 'active' || status === 'paused' || status === 'completed') return 'paid'
  return 'pending'
}

export function campaignDelivery(status: CampaignStatus): 'onair' | 'scheduled' | 'ended' | 'waiting' {
  if (status === 'active') return 'onair'
  if (status === 'scheduled') return 'scheduled'
  if (status === 'completed' || status === 'paused' || status === 'rejected') return 'ended'
  return 'waiting'
}

export function campaignProgress(campaign: KioskCampaign): number {
  if (campaign.status === 'completed') return 100
  if (campaign.status !== 'active' && campaign.status !== 'paused') return 0
  const start = Date.parse(campaign.startDate)
  const end = Date.parse(campaign.endDate)
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return 0
  return Math.min(100, Math.max(0, Math.round((Date.now() - start) / (end - start) * 100)))
}

export function campaignLocation(campaign: KioskCampaign, locations: Location[]): Location | undefined {
  return locations.find((location) => campaign.locationIds.includes(location.id))
}

export function downloadCampaignCsv(campaigns: KioskCampaign[], locations: Location[]): void {
  const quote = (value: string | number) => `"${String(value).replace(/"/g, '""')}"`
  const rows = [
    ['Mã', 'Tên chiến dịch', 'Địa điểm', 'Trạng thái', 'Bắt đầu', 'Kết thúc', 'Ngân sách', 'Lượt hiển thị', 'Lượt tương tác'],
    ...campaigns.map((campaign) => [
      campaign.id, campaign.name, campaignLocation(campaign, locations)?.name ?? '',
      campaignStatusLabel[campaign.status], campaign.startDate, campaign.endDate,
      campaign.budget, campaign.impressions, campaign.clicks,
    ]),
  ]
  const csv = '\uFEFF' + rows.map((row) => row.map(quote).join(',')).join('\r\n')
  const href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
  const link = document.createElement('a')
  link.href = href
  link.download = 'chien-dich-kiosk.csv'
  link.click()
  URL.revokeObjectURL(href)
}
