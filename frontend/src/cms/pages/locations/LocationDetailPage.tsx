import { useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import {
  Activity, Archive, CalendarDays, CheckCircle2, ChevronRight, Clock3,
  Copy, ExternalLink, Eye, Image as ImageIcon, MapPin, Megaphone,
  MoreVertical, PauseCircle, Pencil, Radio, RotateCcw, Trash2,
} from 'lucide-react'
import MockMap from '../../components/MockMap'
import { useCmsData } from '../../data'
import { formatCmsDate, formatCount, locationStatusLabels } from './locationUtils'
import heroImage from './assets/location-hero.jpg'
import gallery2 from './assets/gallery-2.jpg'
import gallery3 from './assets/gallery-3.jpg'
import './locations.scss'

type DetailTab = 'overview' | 'kiosks' | 'history'

export default function LocationDetailPage() {
  const { id } = useParams()
  const navigationState = useLocation().state as { message?: string } | null
  const navigate = useNavigate()
  const { currentRole, currentUser, locations, users, campaigns, moderationItems, updateLocation, deleteLocation } = useCmsData()
  const [tab, setTab] = useState<DetailTab>('overview')
  const [menuOpen, setMenuOpen] = useState(false)
  const [notice, setNotice] = useState(navigationState?.message ?? '')
  const location = locations.find((item) => item.id === id)

  if (!location) return <div className="cms-page"><div className="cms-card cms-empty"><MapPin size={30} /><h3>Không tìm thấy địa điểm</h3><p>Địa điểm đã bị xóa hoặc đường dẫn không còn hợp lệ.</p><Link className="cms-button cms-button--primary" to="/cms/locations">Về danh sách địa điểm</Link></div></div>
  if (currentRole === 'user' && location.ownerId !== currentUser.id ||
    currentRole === 'area_manager' && location.managerId !== currentUser.id) {
    return <div className="cms-page"><div className="cms-card cms-empty"><MapPin size={30} /><h3>Không có quyền xem địa điểm</h3><p>Địa điểm này không thuộc phạm vi tài khoản demo hiện tại.</p><Link className="cms-button cms-button--primary" to="/cms/locations">Về danh sách địa điểm</Link></div></div>
  }

  const owner = users.find((user) => user.id === location.ownerId)
  const manager = users.find((user) => user.id === location.managerId)
  const relatedCampaigns = campaigns.filter((item) => item.locationIds.includes(location.id))
  const relatedReviews = moderationItems.filter((item) => item.locationId === location.id)
  const liveCount = relatedCampaigns.filter((item) => item.status === 'active').length
  const cover = location.imageUrl || heroImage

  function togglePause() {
    if (location?.status === 'published') {
      if (!window.confirm(`Tạm dừng hiển thị địa điểm “${location.name}”?`)) return
      updateLocation(location.id, { status: 'archived' })
      setNotice('Đã tạm dừng hiển thị địa điểm.')
    } else if (location?.status === 'archived') {
      updateLocation(location.id, { status: 'published' })
      setNotice('Đã khôi phục hiển thị địa điểm.')
    }
  }

  function removeLocation() {
    if (!location) return
    if (!window.confirm(`Xóa vĩnh viễn địa điểm “${location.name}”? Các yêu cầu liên quan cũng sẽ bị xóa.`)) return
    deleteLocation(location.id)
    navigate('/cms/locations')
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(window.location.href)
      setNotice('Đã sao chép liên kết địa điểm.')
    } catch {
      setNotice('Không thể sao chép tự động. Hãy sao chép địa chỉ trên thanh trình duyệt.')
    }
    setMenuOpen(false)
  }

  return (
    <div className="cms-page cms-location-detail">
      <div className="cms-location-detail__crumbs"><Link to="/cms/locations">Địa điểm của tôi</Link><ChevronRight size={13} /><span>Chi tiết địa điểm</span></div>
      {notice && <div className="cms-location-detail__notice" role="status"><CheckCircle2 size={16} />{notice}<button type="button" onClick={() => setNotice('')}>Đóng</button></div>}
      <div className="cms-location-detail__head">
        <div><div className="cms-location-detail__title"><h1>{location.name}</h1><span>{location.id.toUpperCase()}</span></div><div className="cms-location-detail__meta"><span className={`cms-badge cms-badge--${location.status}`}>{locationStatusLabels[location.status]}</span><span><Radio size={14} /> {liveCount ? `Đang phát sóng trên ${liveCount} chiến dịch Kiosk` : 'Chưa có chiến dịch đang phát'}</span><span><CheckCircle2 size={14} /> Vị trí GPS đã ghi nhận</span></div></div>
        <div className="cms-location-detail__actions"><Link className="cms-button cms-button--primary" to={`/cms/locations/new?edit=${location.id}`}><Pencil size={15} /> Chỉnh sửa thông tin</Link><Link className="cms-button cms-button--outline" to={`/cms/campaigns/new?location=${location.id}`}><Megaphone size={15} /> Đăng ký chiến dịch mới</Link>{['published', 'archived'].includes(location.status) && <button className="cms-button cms-button--outline" type="button" onClick={togglePause}>{location.status === 'published' ? <PauseCircle size={15} /> : <RotateCcw size={15} />}{location.status === 'published' ? 'Tạm dừng' : 'Khôi phục'}</button>}<div className="cms-location-detail__menu"><button className="cms-button cms-button--outline" type="button" aria-label="Thêm thao tác" aria-expanded={menuOpen} onClick={() => setMenuOpen((value) => !value)}><MoreVertical size={16} /></button>{menuOpen && <div className="cms-location-detail__dropdown"><button type="button" onClick={copyLink}><Copy size={15} /> Sao chép liên kết</button><button type="button" onClick={removeLocation}><Trash2 size={15} /> Xóa hồ sơ</button></div>}</div></div>
      </div>

      <div className="cms-location-detail__tabs" role="tablist" aria-label="Nội dung địa điểm"><button type="button" role="tab" aria-selected={tab === 'overview'} className={tab === 'overview' ? 'is-active' : ''} onClick={() => setTab('overview')}><ImageIcon size={16} /> Tổng quan &amp; Tư liệu</button><button type="button" role="tab" aria-selected={tab === 'kiosks'} className={tab === 'kiosks' ? 'is-active' : ''} onClick={() => setTab('kiosks')}><Radio size={16} /> Hiển thị Kiosk &amp; Thiết bị ({relatedCampaigns.length})</button><button type="button" role="tab" aria-selected={tab === 'history'} className={tab === 'history' ? 'is-active' : ''} onClick={() => setTab('history')}><Activity size={16} /> Lịch sử hoạt động &amp; Kiểm duyệt</button></div>

      {tab === 'overview' && <div className="cms-location-detail__grid">
        <div className="cms-location-detail__main">
          <section className="cms-card cms-location-detail__gallery"><div className="cms-location-detail__hero"><img src={cover} alt={location.name} /><div className="cms-location-detail__hero-caption"><span>TƯ LIỆU CHÍNH · TỐI ƯU KIOSK</span><h2>{location.name}</h2><p>{location.category} · {location.city}</p></div></div><div className="cms-location-detail__gallery-row"><img src={gallery2} alt="Không gian bên trong địa điểm" /><img src={gallery3} alt="Hoạt động tại địa điểm" /><div className="cms-location-detail__gallery-more"><ImageIcon size={22} /><strong>Tư liệu khác</strong><small>Thư viện hình ảnh</small></div></div></section>
          <section className="cms-card cms-location-detail__specs"><div className="cms-card__header"><h2>Thuộc tính Vận hành &amp; Pháp lý</h2><small>Cập nhật theo dữ liệu hồ sơ</small></div><div className="cms-location-detail__spec-grid"><div><small>Tên địa điểm chính thức</small><strong>{location.name}</strong><span>Mã định danh: {location.id.toUpperCase()}</span></div><div><small>Danh mục phân loại chính</small><strong>{location.category}</strong><span>Hiển thị trên bản đồ &amp; kiosk</span></div><div className="cms-location-detail__spec-wide"><small>Mô tả công chúng hiển thị trên Kiosk</small><p>{location.description || 'Chưa có mô tả.'}</p></div><div><small>Địa chỉ thực tế</small><strong>{location.address}</strong><span>{location.district}, {location.city}</span></div><div><small>Thời gian hoạt động &amp; Liên hệ</small><strong>{location.openingHours || 'Chưa cập nhật'}</strong><span>{owner?.phone || 'Chưa có số điện thoại'}</span></div><div><small>Đại diện sở hữu</small><strong>{owner?.name || 'Chưa xác định'}</strong><span>{owner?.organization || ''}</span></div><div><small>Quản lý khu vực</small><strong>{manager?.name || 'Chưa phân công'}</strong><span>Ngày đăng ký: {formatCmsDate(location.createdAt)}</span></div></div></section>
        </div>
        <aside className="cms-location-detail__side"><section className="cms-card cms-location-detail__map-card"><div className="cms-card__header"><h2>Tọa độ &amp; Vùng phủ sóng GIS</h2><span>Ghim địa điểm</span></div><MockMap locations={[location]} selectedId={location.id} height={245} /><div className="cms-location-detail__coords"><span>GIS: {location.latitude.toFixed(5)}° N &nbsp; | &nbsp; {location.longitude.toFixed(5)}° E</span><button type="button" onClick={() => navigator.clipboard.writeText(`${location.latitude}, ${location.longitude}`).then(() => setNotice('Đã sao chép tọa độ.')).catch(() => setNotice('Không thể sao chép tọa độ.'))}><Copy size={13} /> Sao chép</button></div><div className="cms-location-detail__map-meta"><div><MapPin size={16} /><span><strong>{location.district}, {location.city}</strong><small>Vùng phủ sóng mô phỏng</small></span></div><div><Eye size={16} /><span><strong>{formatCount(location.views)} lượt xem</strong><small>Thống kê hiển thị địa điểm</small></span></div></div></section>
          <section className="cms-card cms-location-detail__kiosk-card"><div className="cms-card__header"><h2>Mô phỏng Kiosk Ngoài trời</h2><small>1080 × 1920 (9:16)</small></div><div className="cms-location-detail__kiosk"><div className="cms-location-detail__kiosk-screen"><img src={cover} alt="Nội dung kiosk mô phỏng" /><span>GeoKiosk OS <i /> TRỰC TIẾP</span><div><small>ĐANG CHIẾU TẠI KIOSK</small><strong>{location.name}</strong><small>{location.address}</small><span>Chỉ đường <ExternalLink size={11} /></span></div></div></div><p>Lượt xem trực quan ước tính: <strong>{formatCount(location.views)} lượt</strong></p></section>
          <section className="cms-card cms-location-detail__timeline"><div className="cms-card__header"><h2>Nhật ký hoạt động</h2><button type="button" onClick={() => setTab('history')}>Xem đầy đủ</button></div><div><span><CheckCircle2 size={15} /> Cập nhật hồ sơ địa điểm</span><small>{formatCmsDate(location.updatedAt)}</small><p>Thông tin địa điểm được lưu trong hệ thống demo.</p></div><div><span><MapPin size={15} /> Khởi tạo hồ sơ</span><small>{formatCmsDate(location.createdAt)}</small></div></section>
        </aside>
      </div>}

      {tab === 'kiosks' && <div className="cms-location-detail__tab-content"><section className="cms-card"><div className="cms-card__header"><h2>Chiến dịch liên kết với địa điểm</h2><Link className="cms-button cms-button--primary cms-button--small" to={`/cms/campaigns/new?location=${location.id}`}><Megaphone size={14} /> Tạo chiến dịch</Link></div>{relatedCampaigns.length ? <div className="cms-location-detail__campaign-list">{relatedCampaigns.map((campaign) => <Link key={campaign.id} to={`/cms/campaigns/${campaign.id}`}><div><strong>{campaign.name}</strong><small>{formatCmsDate(campaign.startDate)} – {formatCmsDate(campaign.endDate)}</small></div><span className={`cms-badge cms-badge--${campaign.status}`}>{campaign.status === 'active' ? 'Đang chạy' : campaign.status === 'scheduled' ? 'Sắp diễn ra' : 'Chưa phát sóng'}</span><ChevronRight size={16} /></Link>)}</div> : <div className="cms-empty"><Radio size={30} /><h3>Chưa có chiến dịch liên kết</h3><p>Tạo chiến dịch Kiosk để hiển thị nội dung tại địa điểm này.</p></div>}</section><section className="cms-card"><div className="cms-card__header"><h2>Phạm vi bản đồ</h2></div><MockMap locations={[location]} selectedId={location.id} height={360} /></section></div>}

      {tab === 'history' && <section className="cms-card cms-location-detail__history"><div className="cms-card__header"><h2>Hoạt động &amp; kiểm duyệt</h2><span>{relatedReviews.length} hồ sơ kiểm duyệt</span></div><div className="cms-location-detail__history-list"><div><CalendarDays size={17} /><div><strong>Tạo địa điểm</strong><p>Hồ sơ được tạo bởi {owner?.name || 'người dùng'}.</p><small>{formatCmsDate(location.createdAt)}</small></div></div>{relatedReviews.map((review) => <div key={review.id}><span className={`cms-location-detail__history-icon is-${review.status}`}><CheckCircle2 size={17} /></span><div><strong>{review.title}</strong><p>{review.reviewNote || review.note}</p><small>{formatCmsDate(review.reviewedAt || review.submittedAt)} · <span className={`cms-badge cms-badge--${review.status}`}>{review.status === 'approved' ? 'Đã duyệt' : review.status === 'rejected' ? 'Cần chỉnh sửa' : 'Chờ duyệt'}</span></small></div></div>)}</div></section>}
    </div>
  )
}
