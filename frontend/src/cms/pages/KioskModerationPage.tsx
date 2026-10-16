import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import {
  ArrowRight, CalendarDays, Check, CheckCircle2, ChevronRight, CircleAlert,
  Clock3, FileCheck2, Filter, MapPin, MonitorPlay, Search, ShieldCheck,
  SlidersHorizontal, X,
} from 'lucide-react'
import { useCmsData } from '../data'
import type { KioskRequest, ReviewStatus } from '../data'
import { campaignThumbnails, detailCreative } from './campaigns/campaignAssets'
import './kiosk-moderation.scss'

type Decision = 'approved' | 'rejected'
type QueueFilter = 'all' | 'urgent' | 'technical' | 'missing'
const statusLabel: Record<ReviewStatus, string> = { pending: 'Chờ duyệt', approved: 'Đã duyệt', rejected: 'Từ chối' }
const date = (value: string) => new Date(`${value}T00:00:00`).toLocaleDateString('vi-VN')

export default function KioskModerationPage() {
  const [searchParams] = useSearchParams()
  const { kioskRequests, campaigns, locations, users, reviewKioskRequest } = useCmsData()
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState<ReviewStatus | 'all'>('pending')
  const [queueFilter, setQueueFilter] = useState<QueueFilter>('all')
  const [selectedId, setSelectedId] = useState<string | null>(searchParams.get('request'))
  const [dialog, setDialog] = useState<Decision | null>(null)
  const [note, setNote] = useState('')
  const [error, setError] = useState('')
  const [feedback, setFeedback] = useState('')
  const requestedId = searchParams.get('request')

  useEffect(() => { setSelectedId(requestedId) }, [requestedId])

  const sorted = useMemo(() => [...kioskRequests].sort((a, b) => b.submittedAt.localeCompare(a.submittedAt)), [kioskRequests])
  const getIssues = (request: KioskRequest) => {
    const itemCampaign = campaigns.find((item) => item.id === request.campaignId)
    const itemLocation = locations.find((item) => item.id === request.locationId)
    return [
      !itemCampaign?.creativeTitle || !itemCampaign?.creativeBody ? 'Thiếu nội dung media' : null,
      !itemLocation || itemLocation.status !== 'published' ? 'Địa điểm chưa xuất bản' : null,
      !itemCampaign || itemCampaign.budget <= 0 ? 'Chưa có ngân sách' : null,
      !itemCampaign || itemCampaign.endDate < itemCampaign.startDate ? 'Lịch phát sóng không hợp lệ' : null,
    ].filter((item): item is string => Boolean(item))
  }
  const isUrgent = (request: KioskRequest) => request.status === 'pending' &&
    (Date.now() - new Date(`${request.submittedAt}T00:00:00`).getTime()) >= 48 * 60 * 60 * 1000
  const filtered = sorted.filter((request) => {
    const campaign = campaigns.find((item) => item.id === request.campaignId)
    const location = locations.find((item) => item.id === request.locationId)
    const text = `${request.id} ${request.title} ${campaign?.name ?? ''} ${location?.name ?? ''}`.toLocaleLowerCase('vi')
    return (status === 'all' || request.status === status) &&
      (queueFilter === 'all' ||
        (queueFilter === 'urgent' && isUrgent(request)) ||
        (queueFilter === 'technical' && getIssues(request).length === 0) ||
        (queueFilter === 'missing' && getIssues(request).length > 0)) &&
      text.includes(query.toLocaleLowerCase('vi').trim())
  })
  const selected: KioskRequest | undefined = filtered.find((item) => item.id === selectedId) ?? filtered[0]
  const campaign = campaigns.find((item) => item.id === selected?.campaignId)
  const location = locations.find((item) => item.id === selected?.locationId)
  const requester = users.find((item) => item.id === selected?.requesterId)
  const issues = selected ? getIssues(selected) : []
  const mediaImage = campaign ? campaignThumbnails[Math.max(0, campaigns.findIndex((item) => item.id === campaign.id)) % campaignThumbnails.length] : detailCreative
  const slaHours = selected ? Math.max(0, 72 - Math.floor((Date.now() - new Date(`${selected.submittedAt}T00:00:00`).getTime()) / 3_600_000)) : 0
  const pending = kioskRequests.filter((item) => item.status === 'pending').length
  const approved = kioskRequests.filter((item) => item.status === 'approved').length
  const reviewed = kioskRequests.filter((item) => item.status !== 'pending').length
  const rate = reviewed ? Math.round(approved / reviewed * 100) : 0

  function review(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!selected || !dialog) return
    if (dialog === 'approved' && issues.length) { setError(`Cần xử lý: ${issues.join(', ')}.`); return }
    if (dialog === 'rejected' && note.trim().length < 8) {
      setError('Vui lòng nêu lý do từ chối ít nhất 8 ký tự.')
      return
    }
    reviewKioskRequest(selected.id, dialog, note.trim())
    setFeedback(dialog === 'approved' ? `Đã duyệt yêu cầu ${selected.id}.` : `Đã từ chối yêu cầu ${selected.id}.`)
    closeDialog()
    setSelectedId(null)
  }

  function closeDialog() { setDialog(null); setNote(''); setError('') }
  function openDialog(decision: Decision) { setDialog(decision); setNote(''); setError('') }

  return <div className="cms-page cms-kiosk-review">
    <div className="cms-page-heading"><div className="cms-page-heading__intro"><span className="cms-kiosk-review__eyebrow">QUẢN LÝ KHU VỰC / KIỂM DUYỆT YÊU CẦU KIOSK</span><h1>Kiểm duyệt yêu cầu phát sóng Kiosk</h1><p>Thẩm định nội dung, thời lượng và phạm vi phát sóng trước khi đưa lên mạng lưới Kiosk.</p></div><div className="cms-page-heading__actions"><span className="cms-badge cms-badge--pending">{pending} đang chờ xử lý</span></div></div>
    <div className="cms-kiosk-review__stats">
      <div className="cms-card"><span>Yêu cầu đang chờ</span><strong>{pending}</strong><small><Clock3 size={14} /> Cần kiểm duyệt nội dung</small></div>
      <div className="cms-card"><span>Đã được phê duyệt</span><strong>{approved}</strong><small><CheckCircle2 size={14} /> Nội dung đạt yêu cầu</small></div>
      <div className="cms-card"><span>Tỷ lệ thông qua</span><strong>{rate}%</strong><small><ShieldCheck size={14} /> Theo yêu cầu đã xử lý</small></div>
      <div className="cms-card"><span>Thời gian xử lý dự kiến</span><strong>1,8 giờ</strong><small><CalendarDays size={14} /> Thông số demo</small></div>
    </div>
    {feedback && <div className="cms-kiosk-review__feedback" role="status"><CheckCircle2 size={16} />{feedback}<button type="button" onClick={() => setFeedback('')} aria-label="Đóng thông báo"><X size={15} /></button></div>}
    <div className="cms-kiosk-review__workspace">
      <section className="cms-card cms-kiosk-review__queue"><div className="cms-kiosk-review__queue-head"><div className="cms-kiosk-review__search"><Search size={16} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Tìm chiến dịch, địa điểm, mã yêu cầu..." aria-label="Tìm yêu cầu Kiosk" /></div><label className="cms-kiosk-review__status-select"><Filter size={14} /><select value={status} onChange={(event) => { setStatus(event.target.value as ReviewStatus | 'all'); setSelectedId(null) }} aria-label="Lọc trạng thái"><option value="pending">Chờ duyệt</option><option value="approved">Đã duyệt</option><option value="rejected">Từ chối</option><option value="all">Mọi trạng thái</option></select></label></div><div className="cms-kiosk-review__tabs" role="tablist" aria-label="Lọc hàng đợi">{([['all', 'Tất cả'], ['urgent', 'Khẩn cấp'], ['technical', 'Kiểm tra kỹ thuật'], ['missing', 'Thiếu tài liệu']] as const).map(([value, label]) => <button type="button" role="tab" aria-selected={queueFilter === value} className={queueFilter === value ? 'is-active' : ''} onClick={() => { setQueueFilter(value); setSelectedId(null) }} key={value}>{label}</button>)}</div>
        <div className="cms-kiosk-review__list">{filtered.map((request) => {
          const itemCampaign = campaigns.find((item) => item.id === request.campaignId)
          const itemLocation = locations.find((item) => item.id === request.locationId)
          return <button type="button" className={`cms-kiosk-review__item${selected?.id === request.id ? ' is-selected' : ''}`} onClick={() => setSelectedId(request.id)} key={request.id}><span className="cms-kiosk-review__item-top"><span className={`cms-badge cms-badge--${request.status}`}>{statusLabel[request.status]}</span><small>{isUrgent(request) ? 'Ưu tiên cao' : date(request.submittedAt)}</small></span><strong>{itemCampaign?.name ?? request.title}</strong><span className="cms-kiosk-review__item-place"><MapPin size={13} /> {itemLocation?.name ?? 'Địa điểm không còn tồn tại'}</span><span className="cms-kiosk-review__item-bottom"><span>{request.id.toUpperCase()}</span><span>{getIssues(request).length ? `${getIssues(request).length} điều kiện cần xử lý` : `${request.durationDays} ngày · Sẵn sàng` } <ChevronRight size={14} /></span></span></button>
        })}{filtered.length === 0 && <div className="cms-empty"><SlidersHorizontal size={24} /><h3>Không tìm thấy yêu cầu</h3><p>Thử thay đổi từ khóa hoặc bộ lọc trạng thái.</p></div>}</div>
      </section>

      <section className="cms-card cms-kiosk-review__detail">{selected ? <><div className="cms-kiosk-review__detail-head"><div><span className="cms-kiosk-review__eyebrow">HỒ SƠ / {selected.id.toUpperCase()}</span><h2>{campaign?.name ?? selected.title}</h2><p>Gửi bởi {requester?.name ?? 'Người dùng'} · {date(selected.submittedAt)}</p></div><span className={`cms-badge cms-badge--${selected.status}`}>{statusLabel[selected.status]}</span></div>
        <div className="cms-kiosk-review__detail-grid"><div className="cms-kiosk-review__preview"><div className="cms-kiosk-review__preview-screen"><img src={mediaImage} alt="Nội dung chiến dịch mô phỏng" /><span>GeoKiosk</span><strong>{campaign?.creativeTitle ?? selected.title}</strong><p>{campaign?.creativeBody ?? selected.message}</p><small>Nội dung mô phỏng · 9:16</small></div></div><div className="cms-kiosk-review__specs"><h3>Thông số chiến dịch</h3><dl><div><dt>Địa điểm</dt><dd>{location?.name ?? 'Không xác định'}</dd></div><div><dt>Khu vực</dt><dd>{location?.district}, {location?.city}</dd></div><div><dt>Thời lượng</dt><dd>{selected.durationDays} ngày</dd></div><div><dt>Lịch bắt đầu</dt><dd>{campaign ? date(campaign.startDate) : 'Chưa xác định'}</dd></div><div><dt>Ngân sách</dt><dd>{campaign ? `${new Intl.NumberFormat('vi-VN').format(campaign.budget)} đ` : 'Chưa có'}</dd></div><div><dt>SLA còn lại</dt><dd className={slaHours === 0 ? 'cms-kiosk-review__danger-text' : ''}>{slaHours ? `${slaHours} giờ` : 'Quá hạn'}</dd></div></dl><Link to={campaign ? `/cms/campaigns/${campaign.id}` : `/cms/locations/${location?.id ?? ''}`}>Xem hồ sơ liên quan <ArrowRight size={14} /></Link></div></div>
        <div className="cms-kiosk-review__technical"><div><h3>Thông số tệp phát sóng</h3><span className="cms-badge cms-badge--approved">Tệp mô phỏng</span></div><dl><div><dt>Định dạng</dt><dd>MP4 · H.264</dd></div><div><dt>Độ phân giải</dt><dd>1080 × 1920</dd></div><div><dt>Tốc độ khung</dt><dd>30 FPS</dd></div><div><dt>Âm thanh</dt><dd>Không phát tại Kiosk</dd></div></dl><h3>Tải các trạm Kiosk đề xuất</h3><div className="cms-kiosk-review__load"><span>Trung tâm đô thị</span><meter min="0" max="100" value="68">68%</meter><b>68%</b></div><div className="cms-kiosk-review__load"><span>Cụm thương mại</span><meter min="0" max="100" value="42">42%</meter><b>42%</b></div></div>
        <div className="cms-kiosk-review__checklist"><h3><FileCheck2 size={17} /> Kiểm tra nội dung & điều kiện</h3><div><Check size={15} /> Tỷ lệ media 9:16, H.264 và 30 FPS phù hợp Kiosk.</div><div className={campaign?.creativeTitle && campaign?.creativeBody ? '' : 'cms-kiosk-review__warning'}>{campaign?.creativeTitle && campaign?.creativeBody ? <Check size={15} /> : <CircleAlert size={15} />} Nội dung hiển thị và mô tả chiến dịch đã được cung cấp.</div><div className={location?.status === 'published' ? '' : 'cms-kiosk-review__warning'}>{location?.status === 'published' ? <Check size={15} /> : <CircleAlert size={15} />} Địa điểm đã xuất bản và đủ điều kiện phát sóng.</div><div className={campaign && campaign.budget > 0 && campaign.endDate >= campaign.startDate ? '' : 'cms-kiosk-review__warning'}>{campaign && campaign.budget > 0 && campaign.endDate >= campaign.startDate ? <Check size={15} /> : <CircleAlert size={15} />} Lịch phát sóng và ngân sách hợp lệ.</div>{issues.length > 0 && <div className="cms-kiosk-review__warning"><CircleAlert size={15} /> {issues.join(' · ')}</div>}</div>
        <div className="cms-kiosk-review__requester"><span className="cms-kiosk-review__avatar">{requester?.name.charAt(0) ?? 'G'}</span><div><strong>{requester?.name ?? 'Người dùng'}</strong><small>{requester?.organization} · {requester?.email}</small></div><ChevronRight size={16} /></div>
        {selected.reviewNote && <div className="cms-kiosk-review__review-note"><strong>Ghi chú kiểm duyệt:</strong> {selected.reviewNote}</div>}
        <div className="cms-kiosk-review__detail-actions"><Link className="cms-button cms-button--outline" to="/cms/campaigns">Xem tất cả chiến dịch</Link>{selected.status === 'pending' && <><button className="cms-button cms-button--outline" type="button" onClick={() => openDialog('rejected')}>Từ chối yêu cầu</button><button className="cms-button cms-button--primary" type="button" disabled={issues.length > 0} title={issues.length ? issues.join(', ') : undefined} onClick={() => openDialog('approved')}><Check size={15} /> Phê duyệt phát sóng</button></>}</div>
      </> : <div className="cms-empty"><MonitorPlay size={26} /><h3>Chọn một yêu cầu</h3><p>Chi tiết chiến dịch và thao tác kiểm duyệt sẽ xuất hiện tại đây.</p></div>}</section>
    </div>
    {dialog && selected && <div className="cms-kiosk-review__dialog-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) closeDialog() }}><form className="cms-kiosk-review__dialog" role="dialog" aria-modal="true" aria-labelledby="kiosk-dialog-title" onSubmit={review}><div className="cms-kiosk-review__dialog-head"><h2 id="kiosk-dialog-title">{dialog === 'approved' ? 'Phê duyệt phát sóng' : 'Từ chối yêu cầu'}</h2><button type="button" onClick={closeDialog} aria-label="Đóng"><X size={18} /></button></div><p>{dialog === 'approved' ? `Xác nhận phê duyệt “${selected.title}”?` : `Nêu lý do từ chối để người gửi có thể điều chỉnh “${selected.title}”.`}</p><label className="cms-field">Ghi chú {dialog === 'rejected' ? '*' : '(không bắt buộc)'}<textarea className="cms-textarea" value={note} onChange={(event) => { setNote(event.target.value); setError('') }} placeholder="Nhập nhận xét kiểm duyệt..." autoFocus /></label>{error && <small className="cms-field__error" role="alert">{error}</small>}<div className="cms-kiosk-review__dialog-actions"><button className="cms-button cms-button--outline" type="button" onClick={closeDialog}>Hủy</button><button className={`cms-button ${dialog === 'approved' ? 'cms-button--primary' : 'cms-button--danger'}`} type="submit">Xác nhận</button></div></form></div>}
  </div>
}
