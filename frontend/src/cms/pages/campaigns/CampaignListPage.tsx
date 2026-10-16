import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Activity, CalendarDays, CheckCircle2, ChevronLeft, ChevronRight,
  CirclePause, CirclePlay, CreditCard, Download, Eye, MapPin,
  Pencil, Plus, RotateCcw, Search, Trash2,
} from 'lucide-react'
import { useCmsData } from '../../data'
import type { KioskCampaign } from '../../data/types'
import { campaignThumbnails } from './campaignAssets'
import {
  campaignApproval, campaignDelivery, campaignLocation, campaignPayment,
  campaignProgress, campaignStatusLabel, downloadCampaignCsv,
  formatCampaignDate, formatCampaignNumber,
} from './campaignUtils'
import './campaigns.scss'

type ApprovalFilter = 'all' | 'approved' | 'pending' | 'rejected'
type PaymentFilter = 'all' | 'paid' | 'pending' | 'failed'
type DeliveryFilter = 'all' | 'onair' | 'scheduled' | 'ended'
type SortKey = 'newest' | 'oldest' | 'name' | 'impressions'

const pageSize = 4

const paymentLabels = {
  paid: 'Đã thanh toán',
  pending: 'Chờ thanh toán',
  failed: 'Hoàn tiền',
}

const deliveryLabels = {
  onair: 'Đang phát',
  scheduled: 'Đã lên lịch',
  ended: 'Đã kết thúc',
  waiting: 'Chờ đồng bộ',
}

function CsvExportButton({ campaigns }: { campaigns: KioskCampaign[] }) {
  const { locations } = useCmsData()
  return (
    <button className="cms-button cms-button--outline" type="button"
      onClick={() => downloadCampaignCsv(campaigns, locations)}>
      <Download size={15} /> Xuất báo cáo phát sóng CSV
    </button>
  )
}

export function CampaignListPage() {
  const navigate = useNavigate()
  const {
    campaigns, locations, currentRole, currentUser,
    setCampaignStatus, deleteCampaign,
  } = useCmsData()
  const [search, setSearch] = useState('')
  const [region, setRegion] = useState('all')
  const [approval, setApproval] = useState<ApprovalFilter>('all')
  const [payment, setPayment] = useState<PaymentFilter>('all')
  const [delivery, setDelivery] = useState<DeliveryFilter>('all')
  const [sort, setSort] = useState<SortKey>('newest')
  const [page, setPage] = useState(1)
  const [deleteTarget, setDeleteTarget] = useState<KioskCampaign | null>(null)
  const [notice, setNotice] = useState('')

  const visibleToRole = useMemo(() => currentRole === 'user'
    ? campaigns.filter((campaign) => campaign.ownerId === currentUser.id)
    : campaigns, [campaigns, currentRole, currentUser.id])
  const regions = useMemo(() => Array.from(new Set(
    visibleToRole.map((campaign) => campaignLocation(campaign, locations)?.city)
      .filter((city): city is string => Boolean(city)),
  )), [visibleToRole, locations])

  const filtered = useMemo(() => {
    const query = search.trim().toLocaleLowerCase('vi-VN')
    return visibleToRole.filter((campaign) => {
      const locationNames = campaign.locationIds
        .map((id) => locations.find((location) => location.id === id)?.name ?? '').join(' ')
      const place = campaignLocation(campaign, locations)
      const matchesSearch = !query || [
        campaign.id, campaign.name, campaign.description, locationNames,
      ].join(' ').toLocaleLowerCase('vi-VN').includes(query)
      return matchesSearch &&
        (region === 'all' || place?.city === region) &&
        (approval === 'all' || campaignApproval(campaign.status) === approval) &&
        (payment === 'all' || campaignPayment(campaign.status) === payment) &&
        (delivery === 'all' || campaignDelivery(campaign.status) === delivery)
    }).sort((a, b) => {
      if (sort === 'name') return a.name.localeCompare(b.name, 'vi')
      if (sort === 'impressions') return b.impressions - a.impressions
      const diff = Date.parse(b.createdAt) - Date.parse(a.createdAt)
      return sort === 'oldest' ? -diff : diff
    })
  }, [visibleToRole, locations, search, region, approval, payment, delivery, sort])
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const currentPage = Math.min(page, totalPages)
  const rows = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize)
  const pending = visibleToRole.filter((campaign) => campaign.status === 'pending').length
  const active = visibleToRole.filter((campaign) => campaign.status === 'active').length
  const needsPayment = visibleToRole.filter((campaign) => campaignPayment(campaign.status) === 'pending').length

  function resetFilters() {
    setSearch('')
    setRegion('all')
    setApproval('all')
    setPayment('all')
    setDelivery('all')
    setSort('newest')
    setPage(1)
  }

  function toggleBroadcast(campaign: KioskCampaign) {
    setCampaignStatus(campaign.id, campaign.status === 'active' ? 'paused' : 'active')
    setNotice(campaign.status === 'active'
      ? `Đã tạm dừng chiến dịch “${campaign.name}”.`
      : `Đã tiếp tục phát sóng chiến dịch “${campaign.name}”.`)
  }

  return (
    <main className="cms-page cms-campaigns cms-campaign-list">
      <div className="cms-campaign-breadcrumb">Chiến dịch <span>/</span> <strong>Chiến dịch Kiosk</strong></div>
      <header className="cms-page-heading">
        <div className="cms-page-heading__intro">
          <h1>Chiến dịch phát sóng Kiosk</h1>
          <p>Theo dõi, quản lý tiến độ hiển thị nội dung trên màn hình Kiosk ngoài trời và trạng thái xét duyệt đa chiều.</p>
        </div>
        <div className="cms-page-heading__actions">
          <CsvExportButton campaigns={filtered} />
          <Link className="cms-button cms-button--primary" to="/cms/campaigns/new"><Plus size={16} /> Tạo chiến dịch Kiosk mới</Link>
        </div>
      </header>

      {notice && <div className="cms-campaign-notice" role="status">{notice}
        <button type="button" onClick={() => setNotice('')} aria-label="Đóng thông báo">×</button>
      </div>}

      <div className="cms-campaign-metrics">
        <div className="cms-campaign-metric">
          <div className="cms-campaign-metric__top"><span>Tổng chiến dịch</span><span className="cms-campaign-metric__icon cms-campaign-metric__icon--slate"><Activity size={18} /></span></div>
          <strong>{visibleToRole.length} <small>chiến dịch</small></strong>
          <p>Trong toàn mạng lưới GIS</p>
        </div>
        <div className="cms-campaign-metric">
          <div className="cms-campaign-metric__top"><span>Đang phát trực tiếp</span><span className="cms-campaign-metric__icon cms-campaign-metric__icon--teal"><CirclePlay size={18} /></span></div>
          <strong>{active} <small>chiến dịch</small></strong>
          <p>Trên các điểm Kiosk hoạt động</p>
        </div>
        <div className="cms-campaign-metric">
          <div className="cms-campaign-metric__top"><span>Chờ duyệt nội dung / KT</span><span className="cms-campaign-metric__icon cms-campaign-metric__icon--blue"><CheckCircle2 size={18} /></span></div>
          <strong>{pending} <small>chiến dịch</small></strong>
          <p>Đang kiểm tra tư liệu phát sóng</p>
        </div>
        <div className="cms-campaign-metric">
          <div className="cms-campaign-metric__top"><span>Cần thanh toán chu kỳ</span><span className="cms-campaign-metric__icon cms-campaign-metric__icon--rose"><CreditCard size={18} /></span></div>
          <strong>{needsPayment} <small>chiến dịch</small></strong>
          <p>Chờ hoàn tất bước thanh toán mẫu</p>
        </div>
      </div>

      <section className="cms-card cms-campaign-filters" aria-label="Bộ lọc chiến dịch">
        <div className="cms-campaign-filters__top">
          <label className="cms-campaign-search">
            <Search size={16} />
            <input value={search} onChange={(event) => { setSearch(event.target.value); setPage(1) }}
              placeholder="Tìm theo tên chiến dịch, địa điểm ghim, hoặc mã Kiosk..." />
          </label>
          <div className="cms-campaign-filters__tools">
            <label>Sắp xếp:
              <select value={sort} onChange={(event) => setSort(event.target.value as SortKey)}>
                <option value="newest">Mới nhất</option>
                <option value="oldest">Cũ nhất</option>
                <option value="name">Tên A–Z</option>
                <option value="impressions">Lượt hiển thị</option>
              </select>
            </label>
            <button className="cms-campaign-icon-button" type="button" onClick={resetFilters} title="Đặt lại bộ lọc" aria-label="Đặt lại bộ lọc"><RotateCcw size={16} /></button>
          </div>
        </div>
        <div className="cms-campaign-filters__row">
          <label>Khu vực:
            <select value={region} onChange={(event) => { setRegion(event.target.value); setPage(1) }}>
              <option value="all">Tất cả khu vực</option>
              {regions.map((city) => <option key={city} value={city}>{city}</option>)}
            </select>
          </label>
          <div className="cms-campaign-filter-group"><span>Phê duyệt:</span>
            {(['all', 'approved', 'pending', 'rejected'] as const).map((value) =>
              <button key={value} type="button" className={approval === value ? 'is-active' : ''}
                onClick={() => { setApproval(value); setPage(1) }}>
                {{ all: 'Tất cả', approved: 'Đã phê duyệt', pending: 'Chờ duyệt', rejected: 'Bị từ chối' }[value]}
              </button>)}
          </div>
          <div className="cms-campaign-filter-group"><span>Thanh toán:</span>
            {(['all', 'paid', 'pending', 'failed'] as const).map((value) =>
              <button key={value} type="button" className={payment === value ? 'is-active' : ''}
                onClick={() => { setPayment(value); setPage(1) }}>
                {{ all: 'Tất cả', paid: 'Đã thanh toán', pending: 'Chờ thanh toán', failed: 'Thất bại' }[value]}
              </button>)}
          </div>
          <div className="cms-campaign-filter-group"><span>Phát sóng:</span>
            {(['all', 'onair', 'scheduled', 'ended'] as const).map((value) =>
              <button key={value} type="button" className={delivery === value ? 'is-active' : ''}
                onClick={() => { setDelivery(value); setPage(1) }}>
                {{ all: 'Tất cả', onair: 'Đang phát', scheduled: 'Đã lên lịch', ended: 'Đã kết thúc' }[value]}
              </button>)}
          </div>
        </div>
      </section>

      <section className="cms-card cms-campaign-table-card" aria-label="Danh sách chiến dịch">
        <div className="cms-table-wrap">
          <table className="cms-table cms-campaign-table">
            <thead><tr>
              <th>Tên chiến dịch & Địa điểm</th><th>Khu vực & Phạm vi</th>
              <th>Kiosk mục tiêu</th><th>Lịch trình & Tiến độ</th>
              <th>Phê duyệt</th><th>Thanh toán</th><th>Phát sóng</th><th>Thao tác</th>
            </tr></thead>
            <tbody>
              {rows.map((campaign, index) => {
                const location = campaignLocation(campaign, locations)
                const approvalState = campaignApproval(campaign.status)
                const paymentState = campaignPayment(campaign.status)
                const deliveryState = campaignDelivery(campaign.status)
                const progress = campaignProgress(campaign)
                const rowNumber = (currentPage - 1) * pageSize + index
                return <tr key={campaign.id}>
                  <td>
                    <div className="cms-campaign-title-cell">
                      <img src={campaignThumbnails[rowNumber % campaignThumbnails.length]} alt="" />
                      <div><Link to={`/cms/campaigns/${campaign.id}`} className="cms-campaign-row-title">{campaign.name}</Link>
                        <small>{location?.name ?? 'Chưa chọn địa điểm gốc'}</small></div>
                    </div>
                  </td>
                  <td><div className="cms-campaign-stack"><strong>{location?.city ?? 'Chưa phân vùng'}</strong>
                    <small>{location?.district ?? '—'}</small></div></td>
                  <td><div className="cms-campaign-stack"><strong>{campaign.locationIds.length * 3} Kiosk mục tiêu</strong>
                    <small className="cms-campaign-hub-tags">{campaign.locationIds.length ? '#K-102  #K-105  #K-108' : 'Chưa gán thiết bị'}</small></div></td>
                  <td><div className="cms-campaign-stack"><strong><CalendarDays size={12} /> {formatCampaignDate(campaign.startDate)} – {formatCampaignDate(campaign.endDate)}</strong>
                    <small>Tiến độ: {campaignStatusLabel[campaign.status]} · {progress}%</small>
                    <div className="cms-campaign-progress"><i style={{ width: `${progress}%` }} /></div></div></td>
                  <td><span className={`cms-campaign-state cms-campaign-state--${approvalState}`}>
                    {approvalState === 'approved' ? 'Đã duyệt' : approvalState === 'pending' ? 'Chờ duyệt' : 'Từ chối'}</span></td>
                  <td><span className={`cms-campaign-state cms-campaign-state--${paymentState}`}>{paymentLabels[paymentState]}</span></td>
                  <td><span className={`cms-campaign-state cms-campaign-state--${deliveryState}`}>{deliveryLabels[deliveryState]}</span></td>
                  <td><div className="cms-campaign-row-actions">
                    <button type="button" title="Xem chi tiết" aria-label={`Xem ${campaign.name}`} onClick={() => navigate(`/cms/campaigns/${campaign.id}`)}><Eye size={16} /></button>
                    <button type="button" title="Chỉnh sửa" aria-label={`Chỉnh sửa ${campaign.name}`} onClick={() => navigate(`/cms/campaigns/${campaign.id}/edit`)}><Pencil size={16} /></button>
                    {(campaign.status === 'active' || campaign.status === 'paused') &&
                      <button type="button" title={campaign.status === 'active' ? 'Tạm dừng' : 'Tiếp tục'} aria-label={`${campaign.status === 'active' ? 'Tạm dừng' : 'Tiếp tục'} ${campaign.name}`} onClick={() => toggleBroadcast(campaign)}>
                        {campaign.status === 'active' ? <CirclePause size={16} /> : <CirclePlay size={16} />}
                      </button>}
                    <button type="button" title="Xóa" aria-label={`Xóa ${campaign.name}`} onClick={() => setDeleteTarget(campaign)}><Trash2 size={16} /></button>
                  </div></td>
                </tr>
              })}
            </tbody>
          </table>
          {rows.length === 0 && <div className="cms-empty"><Search size={28} /><h3>Không tìm thấy chiến dịch</h3>
            <p>Thử thay đổi từ khóa hoặc đặt lại bộ lọc để xem các chiến dịch hiện có.</p>
            <button className="cms-button cms-button--outline" type="button" onClick={resetFilters}>Đặt lại bộ lọc</button>
          </div>}
        </div>
        <div className="cms-pagination">
          <span>Hiển thị {filtered.length ? (currentPage - 1) * pageSize + 1 : 0} đến {Math.min(currentPage * pageSize, filtered.length)} trên tổng số {formatCampaignNumber(filtered.length)} chiến dịch Kiosk</span>
          <div className="cms-pagination__buttons">
            <button type="button" disabled={currentPage === 1} onClick={() => setPage(currentPage - 1)} aria-label="Trang trước"><ChevronLeft size={15} /></button>
            {Array.from({ length: totalPages }, (_, index) => <button key={index} type="button"
              className={currentPage === index + 1 ? 'is-current' : ''}
              onClick={() => setPage(index + 1)} aria-label={`Trang ${index + 1}`}>{index + 1}</button>)}
            <button type="button" disabled={currentPage === totalPages} onClick={() => setPage(currentPage + 1)} aria-label="Trang sau"><ChevronRight size={15} /></button>
          </div>
        </div>
      </section>
      <p className="cms-campaign-list__foot"><MapPin size={13} /> Trạng thái thiết bị, thanh toán và tiến độ ở bản demo được mô phỏng bằng dữ liệu cục bộ.</p>

      {deleteTarget && <div className="cms-campaign-modal-backdrop" onMouseDown={() => setDeleteTarget(null)}>
        <div className="cms-campaign-modal" role="dialog" aria-modal="true" aria-labelledby="campaign-delete-title" onMouseDown={(event) => event.stopPropagation()}>
          <div className="cms-campaign-modal__icon"><Trash2 size={20} /></div>
          <h2 id="campaign-delete-title">Xóa chiến dịch?</h2>
          <p>“{deleteTarget.name}” và yêu cầu Kiosk liên quan sẽ bị xóa khỏi dữ liệu demo.</p>
          <div className="cms-campaign-modal__actions">
            <button className="cms-button cms-button--outline" type="button" onClick={() => setDeleteTarget(null)}>Hủy bỏ</button>
            <button className="cms-button cms-button--danger" type="button" onClick={() => {
              deleteCampaign(deleteTarget.id)
              setNotice(`Đã xóa chiến dịch “${deleteTarget.name}”.`)
              setDeleteTarget(null)
            }}>Xóa chiến dịch</button>
          </div>
        </div>
      </div>}
    </main>
  )
}
