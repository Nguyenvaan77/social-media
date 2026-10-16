import { useMemo, useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import {
  Activity, ArrowLeft, CalendarDays, CheckCircle2, ChevronRight,
  CirclePause, CirclePlay, Clock3, CreditCard, Download, Eye,
  FileVideo2, MapPin, Maximize2, MonitorPlay, MousePointer2,
  Pencil, Plus, QrCode, Radio, RefreshCw, Trash2,
} from 'lucide-react'
import { useCmsData } from '../../data'
import { detailCreative, detailMap } from './campaignAssets'
import {
  campaignApproval, campaignLocation, campaignPayment, campaignProgress,
  campaignStatusLabel, downloadCampaignCsv, formatCampaignDate,
  formatCampaignMoney, formatCampaignNumber,
} from './campaignUtils'
import './campaigns.scss'

const hubs = [
  { id: 'K-102', place: 'Đại lộ Lê Lợi', detail: 'Panel Cột Tây #02', latency: '12ms', views: 3420, x: 35, y: 43 },
  { id: 'K-105', place: 'Trạm Metro Ngầm B1', detail: 'Khu sảnh chính Cổng 3', latency: '18ms', views: 4110, x: 52, y: 55 },
  { id: 'K-108', place: 'Ngã tư Nguyễn Huệ', detail: 'Trục đi bộ Landmark', latency: '14ms', views: 5890, x: 65, y: 38 },
]

export function CampaignDetailPage() {
  const navigate = useNavigate()
  const routeLocation = useLocation()
  const { id } = useParams()
  const {
    campaigns, locations, kioskRequests,
    setCampaignStatus, updateCampaign, deleteCampaign,
  } = useCmsData()
  const campaign = campaigns.find((item) => item.id === id)
  const [notice, setNotice] = useState((routeLocation.state as { notice?: string } | null)?.notice ?? '')
  const [viewMode, setViewMode] = useState<'portrait' | 'landscape'>('portrait')
  const [playing, setPlaying] = useState(true)
  const [selectedHub, setSelectedHub] = useState(hubs[0].id)
  const [showExtend, setShowExtend] = useState(false)
  const [extendDate, setExtendDate] = useState(campaign?.endDate ?? '')
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [showAllAudit, setShowAllAudit] = useState(false)
  const relatedRequests = useMemo(() => kioskRequests.filter((request) => request.campaignId === id),
    [kioskRequests, id])
  const latestRequest = relatedRequests[0]

  if (!campaign) return <main className="cms-page cms-campaigns"><div className="cms-card cms-empty">
    <h1>Không tìm thấy chiến dịch</h1><p>Chiến dịch có thể đã bị xóa khỏi dữ liệu demo.</p>
    <Link className="cms-button cms-button--primary" to="/cms/campaigns">Về danh sách</Link>
  </div></main>

  const place = campaignLocation(campaign, locations)
  const progress = campaignProgress(campaign)
  const approval = campaignApproval(campaign.status)
  const payment = campaignPayment(campaign.status)
  const kioskIds = campaign.kioskIds?.length ? campaign.kioskIds : hubs.map((hub) => hub.id)
  const activeHubs = hubs.filter((hub) => kioskIds.includes(hub.id))
  const days = Math.max(1, Math.round((Date.parse(campaign.endDate) - Date.parse(campaign.startDate)) / 86_400_000) + 1 || 1)
  const clickThrough = campaign.impressions > 0 ? campaign.clicks / campaign.impressions * 100 : 0
  const stage = campaign.status === 'draft' ? 1 : campaign.status === 'pending' || campaign.status === 'rejected' ? 2
    : campaign.status === 'scheduled' ? 4 : campaign.status === 'completed' ? 6 : 5
  const milestones = [
    ['Nộp yêu cầu', 'Đã gửi dữ liệu'],
    ['Kiểm duyệt 4K', campaign.status === 'rejected' ? 'Cần điều chỉnh' : 'Chuẩn codec H.265'],
    ['Thanh toán', 'Mô phỏng chu kỳ'],
    ['Nạp Kiosk Hubs', 'Đồng bộ OTA'],
    ['Đang phát trực tiếp', kioskIds.join(', ')],
    ['Hoàn tất chu kỳ', 'Báo cáo kiểm toán'],
  ]
  const audit = [
    { title: 'Chiến dịch được cập nhật', detail: `Trạng thái hiện tại: ${campaignStatusLabel[campaign.status]}`, date: campaign.updatedAt },
    ...(latestRequest ? [{
      title: latestRequest.status === 'approved' ? 'Đã phê duyệt phát sóng Kiosk'
        : latestRequest.status === 'rejected' ? 'Yêu cầu cần điều chỉnh' : 'Đã gửi yêu cầu kiểm duyệt',
      detail: latestRequest.reviewNote || latestRequest.message,
      date: latestRequest.reviewedAt || latestRequest.submittedAt,
    }] : []),
    { title: 'Khởi tạo chiến dịch', detail: `Địa điểm gốc: ${place?.name ?? 'chưa chọn'}`, date: campaign.createdAt },
  ]

  function toggleStatus() {
    if (!campaign) return
    const next = campaign.status === 'active' ? 'paused' : 'active'
    setCampaignStatus(campaign.id, next)
    setNotice(next === 'paused' ? 'Đã tạm dừng phát sóng trong dữ liệu demo.' : 'Đã tiếp tục phát sóng trong dữ liệu demo.')
  }

  function extendCampaign() {
    if (!campaign) return
    if (!extendDate || extendDate <= campaign.endDate) {
      setNotice('Ngày gia hạn phải sau ngày kết thúc hiện tại.')
      return
    }
    updateCampaign(campaign.id, { endDate: extendDate })
    setShowExtend(false)
    setNotice(`Đã gia hạn chiến dịch đến ${formatCampaignDate(extendDate)}.`)
  }

  return <main className="cms-page cms-campaigns cms-campaign-detail">
    <div className="cms-campaign-breadcrumb"><Link to="/cms/campaigns">Chiến dịch</Link><span>/</span><Link to="/cms/campaigns">Danh sách chiến dịch</Link><span>/</span><strong>Chi tiết vòng đời</strong></div>
    <header className="cms-page-heading cms-campaign-detail__header">
      <div className="cms-page-heading__intro">
        <div className="cms-campaign-detail__back"><Link to="/cms/campaigns"><ArrowLeft size={15} /> Về danh sách</Link><span>#{campaign.id.toUpperCase()}</span></div>
        <h1>{campaign.name}</h1>
        <p><MapPin size={14} /> {place?.name ?? 'Chưa chọn địa điểm'} · {place?.city ?? 'Chưa phân vùng'} <span>·</span> {campaignStatusLabel[campaign.status]}</p>
      </div>
      <div className="cms-page-heading__actions">
        {(campaign.status === 'active' || campaign.status === 'paused') &&
          <button className="cms-button cms-button--outline" type="button" onClick={toggleStatus}>
            {campaign.status === 'active' ? <CirclePause size={15} /> : <CirclePlay size={15} />}
            {campaign.status === 'active' ? 'Tạm dừng phát sóng' : 'Tiếp tục phát sóng'}</button>}
        <button className="cms-button cms-button--outline" type="button" onClick={() => navigate(`/cms/campaigns/${campaign.id}/edit`)}><Pencil size={15} /> Chỉnh sửa nội dung</button>
        <button className="cms-button cms-button--outline" type="button" onClick={() => downloadCampaignCsv([campaign], locations)}><Download size={15} /> Xuất báo cáo phát</button>
        <button className="cms-button cms-button--primary" type="button" onClick={() => setShowExtend(true)}><CalendarDays size={15} /> Gia hạn chiến dịch</button>
      </div>
    </header>
    {notice && <div className="cms-campaign-notice" role="status">{notice}
      <button type="button" aria-label="Đóng thông báo" onClick={() => setNotice('')}>×</button></div>}

    <div className="cms-campaign-lifecycle-cards">
      <div className="cms-campaign-lifecycle-card"><span>1. Trạng thái Phê duyệt</span>
        <strong className={`cms-campaign-lifecycle-card__value cms-campaign-lifecycle-card__value--${approval}`}><CheckCircle2 size={15} /> {approval === 'approved' ? 'ĐÃ PHÊ DUYỆT' : approval === 'pending' ? 'CHỜ PHÊ DUYỆT' : 'CẦN ĐIỀU CHỈNH'}</strong>
        <small>{latestRequest?.reviewerId ? 'Đã được quản lý khu vực xử lý' : 'Theo dõi trong hàng đợi xét duyệt'}</small>
        <small>Thời gian: {formatCampaignDate(latestRequest?.reviewedAt || latestRequest?.submittedAt || campaign.createdAt)}</small>
      </div>
      <div className="cms-campaign-lifecycle-card"><span>2. Trạng thái Thanh toán</span>
        <strong className={`cms-campaign-lifecycle-card__value cms-campaign-lifecycle-card__value--${payment}`}><CreditCard size={15} /> {payment === 'paid' ? 'ĐÃ THANH TOÁN' : payment === 'failed' ? 'CHƯA HOÀN TẤT' : 'CHỜ THANH TOÁN'}</strong>
        <small>Hóa đơn demo: #INV-{campaign.id.replace(/\D/g, '').padStart(4, '0')}</small>
        <small>Giá trị dự toán: {formatCampaignMoney(campaign.budget)}</small>
      </div>
      <div className="cms-campaign-lifecycle-card"><span>3. Đồng bộ Thiết bị</span>
        <strong className="cms-campaign-lifecycle-card__value cms-campaign-lifecycle-card__value--blue"><RefreshCw size={15} /> {campaign.status === 'active' ? 'ĐÃ ĐỒNG BỘ 100%' : 'SẴN SÀNG ĐỒNG BỘ'}</strong>
        <small>{activeHubs.length}/{activeHubs.length} Kiosk Hubs ngoại vi</small>
        <small>Gói nội dung Kiosk · Bản demo cục bộ</small>
      </div>
      <div className="cms-campaign-lifecycle-card"><span>4. Trạng thái Phát sóng</span>
        <strong className={`cms-campaign-lifecycle-card__value cms-campaign-lifecycle-card__value--${campaign.status === 'active' ? 'onair' : 'muted'}`}><Radio size={15} /> {campaignStatusLabel[campaign.status].toUpperCase()}</strong>
        <small>Tiến độ: {progress}% của {days} ngày</small>
        <div className="cms-campaign-progress"><i style={{ width: `${progress}%` }} /></div>
      </div>
    </div>

    <section className="cms-card cms-campaign-timeline">
      <div className="cms-card__header"><div><h2>Tiến trình vòng đời chiến dịch Kiosk <small>(Lifecycle Timeline)</small></h2><p>Quy trình tự động hóa GIS</p></div><Activity size={17} /></div>
      <div className="cms-campaign-timeline__steps">
        {milestones.map(([title, subtitle], index) => <div key={title} className={`cms-campaign-timeline__step ${index + 1 <= stage ? 'is-done' : ''} ${index + 1 === stage ? 'is-current' : ''}`}>
          <span className="cms-campaign-timeline__dot">{String(index + 1).padStart(2, '0')}</span>
          <strong>{title}</strong><small>{subtitle}</small>
        </div>)}
      </div>
    </section>

    <div className="cms-campaign-detail-grid">
      <div className="cms-campaign-detail-grid__main">
        <section className="cms-card cms-campaign-creative">
          <div className="cms-card__header"><div><h2>Tư liệu truyền thông số & Giả lập Kiosk</h2><p>Nội dung đã được biên dịch sang canvas Kiosk 4K Ultra-HD</p></div>
            <div className="cms-campaign-segmented"><button type="button" className={viewMode === 'portrait' ? 'is-active' : ''} onClick={() => setViewMode('portrait')}>9:16 Dọc</button>
              <button type="button" className={viewMode === 'landscape' ? 'is-active' : ''} onClick={() => setViewMode('landscape')}>16:9 Ngang</button></div></div>
          <div className={`cms-campaign-creative__stage cms-campaign-creative__stage--${viewMode}`}>
            <div className="cms-campaign-creative__screen">
              <img src={detailCreative} alt="Tư liệu minh họa quảng bá đồ uống trên Kiosk" />
              <span className="cms-campaign-creative__live">4K {playing ? 'LIVE' : 'TẠM DỪNG'}</span>
              <div className="cms-campaign-creative__caption"><strong>{campaign.creativeTitle || campaign.name}</strong><small>{campaign.creativeBody || campaign.description}</small></div>
            </div>
            <div className="cms-campaign-creative__controls">
              <button type="button" onClick={() => setPlaying(!playing)} aria-label={playing ? 'Tạm dừng xem trước' : 'Phát xem trước'}>{playing ? <CirclePause size={19} /> : <CirclePlay size={19} />}</button>
              <span>{playing ? '00:08 / 00:15 · Lặp lại tự động' : 'Xem trước đã tạm dừng'}</span>
              <span>4K UHD</span>
              <button type="button" onClick={() => setViewMode(viewMode === 'portrait' ? 'landscape' : 'portrait')} aria-label="Đổi tỷ lệ xem trước"><Maximize2 size={18} /></button>
            </div>
          </div>
          <div className="cms-campaign-creative__meta"><span><FileVideo2 size={15} /> {campaign.mediaFileName || 'Tư liệu mẫu Stitch'}</span><span>15.0s · H.265 Master · 60fps</span></div>
        </section>

        <section className="cms-card cms-campaign-hubs">
          <div className="cms-card__header"><div><h2>Danh sách Kiosk phần cứng đang phát sóng</h2><p>Giám sát độ trễ vi mô, tình trạng buffer và số lượt chiếu</p></div><span className="cms-campaign-online"><i /> {activeHubs.length}/{activeHubs.length} Điểm Trực Tuyến</span></div>
          <div className="cms-table-wrap"><table className="cms-table"><thead><tr><th>Mã Hub & Vị trí</th><th>Trạng thái Hub</th><th>Độ trễ</th><th>Lượt xem hôm nay</th><th>Thao tác</th></tr></thead>
            <tbody>{activeHubs.map((hub) => <tr key={hub.id}><td><div className="cms-campaign-hub-name"><MonitorPlay size={17} /><span><strong>{hub.id} · {hub.place}</strong><small>{hub.detail}</small></span></div></td>
              <td><span className="cms-campaign-online"><i /> Trực tuyến</span></td><td>{hub.latency}</td><td>{formatCampaignNumber(campaign.impressions ? Math.round(campaign.impressions / Math.max(1, activeHubs.length)) : hub.views)}</td>
              <td><button className="cms-campaign-icon-button" type="button" onClick={() => { setSelectedHub(hub.id); document.getElementById('cms-campaign-detail-map')?.scrollIntoView({ behavior: 'smooth' }) }} aria-label={`Xem ${hub.id} trên bản đồ`}><Eye size={16} /></button></td></tr>)}</tbody></table></div>
        </section>

        <section className="cms-card cms-campaign-schedule">
          <div className="cms-card__header"><div><h2>Lịch phát sóng & Tần suất vận hành</h2><p>Động cơ lập lịch GeoScheduler v2 · dữ liệu demo</p></div><Clock3 size={17} /></div>
          <div className="cms-campaign-schedule__grid">
            <div><CalendarDays size={18} /><span>Khung thời gian<strong>{formatCampaignDate(campaign.startDate)} — {formatCampaignDate(campaign.endDate)}</strong><small>Tổng thời lượng {days} ngày lịch</small></span></div>
            <div><Clock3 size={18} /><span>Giờ phát hàng ngày<strong>07:00 — 22:00</strong><small>15 giờ phát sóng/ngày</small></span></div>
            <div><RefreshCw size={18} /><span>Tần suất chiếu Kiosk<strong>{campaign.frequency ?? 12} lượt / giờ / Kiosk</strong><small>Trung bình {Math.round(60 / (campaign.frequency ?? 12))} phút / lượt xoay</small></span></div>
          </div>
        </section>
      </div>

      <aside className="cms-campaign-detail-grid__side">
        <section className="cms-card cms-campaign-gis" id="cms-campaign-detail-map">
          <div className="cms-card__header"><div><h2>Bản đồ định vị GIS & Phạm vi phát sóng</h2><p>{campaign.zone || place?.district || 'Bán kính phủ sóng 450m quanh điểm ghim trung tâm'}</p></div><MapPin size={17} /></div>
          <div className="cms-campaign-gis__map" style={{ backgroundImage: `url(${detailMap})` }}>
            <span className="cms-campaign-gis__origin"><MapPin size={14} /> {place?.name ?? 'PIN trung tâm'}</span>
            {activeHubs.map((hub) => <button type="button" key={hub.id} title={hub.place}
              className={`cms-campaign-gis__pin ${selectedHub === hub.id ? 'is-selected' : ''}`}
              style={{ left: `${hub.x}%`, top: `${hub.y}%` }} onClick={() => setSelectedHub(hub.id)}>{hub.id}</button>)}
          </div>
          <div className="cms-campaign-gis__footer"><strong>{selectedHub}</strong> · {activeHubs.find((hub) => hub.id === selectedHub)?.place ?? 'Thiết bị đã chọn'}<small>Hệ tọa độ WGS84 · {place ? `${place.latitude.toFixed(4)}° N, ${place.longitude.toFixed(4)}° E` : 'Mô phỏng'}</small></div>
        </section>

        <section className="cms-card cms-campaign-analytics">
          <div className="cms-card__header"><div><h2>Thống kê tương tác thực tế</h2><p>Dữ liệu demo được cập nhật trong trình duyệt</p></div><Activity size={17} /></div>
          <div className="cms-campaign-analytics__grid">
            <div><span>Lượt hiển thị (Est.)</span><strong>{formatCampaignNumber(campaign.impressions)}</strong><small><Eye size={13} /> Tích lũy</small></div>
            <div><span>Quét mã QR tương tác</span><strong>{formatCampaignNumber(campaign.clicks)}</strong><small><QrCode size={13} /> CTR {clickThrough.toFixed(2)}%</small></div>
            <div><span>Tỷ lệ phát thành công</span><strong>{campaign.status === 'active' ? '99,8%' : '—'}</strong><small><CheckCircle2 size={13} /> Trạng thái mô phỏng</small></div>
          </div>
          <div className="cms-campaign-analytics__chart"><div><strong>Phân bổ lượt chiếu 5 ngày qua</strong><small>Mục tiêu: {formatCampaignNumber(Math.ceil(campaign.impressions / 30))} lượt/ngày</small></div>
            <div className="cms-campaign-analytics__bars">{[48, 64, 77, 66, 91].map((height, index) => <span key={index}><i style={{ height: `${height}%` }} /><small>{index === 4 ? 'Hôm nay' : `Ngày ${index + 1}`}</small></span>)}</div></div>
        </section>

        <section className="cms-card cms-campaign-audit">
          <div className="cms-card__header"><div><h2>Nhật ký vận hành & Kiểm toán</h2><p>Các mốc thay đổi của chiến dịch</p></div><Radio size={17} /></div>
          <div className="cms-campaign-audit__events">
            {(showAllAudit ? audit : audit.slice(0, 3)).map((item, index) => <div key={index}>
              <span className="cms-campaign-audit__dot" /><strong>{item.title}</strong>
              <p>{item.detail}</p><small>{formatCampaignDate(item.date)}</small>
            </div>)}
          </div>
          <button className="cms-campaign-audit__more" type="button" onClick={() => setShowAllAudit(!showAllAudit)}>
            {showAllAudit ? 'Thu gọn nhật ký' : 'Xem toàn bộ nhật ký kiểm toán'} <ChevronRight size={15} /></button>
        </section>
      </aside>
    </div>

    <div className="cms-campaign-detail__bottom">
      <button className="cms-button cms-button--outline" type="button" onClick={() => navigate('/cms/campaigns')}><ArrowLeft size={15} /> Quay lại danh sách</button>
      <button className="cms-button cms-button--outline cms-campaign-detail__delete" type="button" onClick={() => setDeleteOpen(true)}><Trash2 size={15} /> Xóa chiến dịch</button>
    </div>

    {showExtend && <div className="cms-campaign-modal-backdrop" onMouseDown={() => setShowExtend(false)}>
      <div className="cms-campaign-modal" role="dialog" aria-modal="true" aria-labelledby="campaign-extend-title" onMouseDown={(event) => event.stopPropagation()}>
        <div className="cms-campaign-modal__icon cms-campaign-modal__icon--teal"><CalendarDays size={20} /></div>
        <h2 id="campaign-extend-title">Gia hạn chiến dịch</h2>
        <p>Ngày kết thúc hiện tại: {formatCampaignDate(campaign.endDate)}. Chọn ngày mới để cập nhật lịch demo.</p>
        <label className="cms-field"><span>Ngày kết thúc mới</span><input className="cms-input" type="date" min={addOneDay(campaign.endDate)} value={extendDate} onChange={(event) => setExtendDate(event.target.value)} /></label>
        <div className="cms-campaign-modal__actions"><button className="cms-button cms-button--outline" type="button" onClick={() => setShowExtend(false)}>Hủy bỏ</button>
          <button className="cms-button cms-button--primary" type="button" onClick={extendCampaign}>Lưu gia hạn</button></div>
      </div>
    </div>}
    {deleteOpen && <div className="cms-campaign-modal-backdrop" onMouseDown={() => setDeleteOpen(false)}>
      <div className="cms-campaign-modal" role="dialog" aria-modal="true" aria-labelledby="campaign-detail-delete-title" onMouseDown={(event) => event.stopPropagation()}>
        <div className="cms-campaign-modal__icon"><Trash2 size={20} /></div><h2 id="campaign-detail-delete-title">Xóa chiến dịch?</h2>
        <p>“{campaign.name}” và các yêu cầu phát sóng liên quan sẽ bị xóa khỏi dữ liệu demo.</p>
        <div className="cms-campaign-modal__actions"><button className="cms-button cms-button--outline" type="button" onClick={() => setDeleteOpen(false)}>Hủy bỏ</button>
          <button className="cms-button cms-button--danger" type="button" onClick={() => { deleteCampaign(campaign.id); navigate('/cms/campaigns') }}>Xóa chiến dịch</button></div>
      </div>
    </div>}
  </main>
}

function addOneDay(value: string): string {
  const date = new Date(value + 'T00:00:00')
  date.setDate(date.getDate() + 1)
  return date.toISOString().slice(0, 10)
}
