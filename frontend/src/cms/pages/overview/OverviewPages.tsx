import { useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Activity, ArrowRight, BarChart3, CalendarDays, CheckCircle2, ChevronRight,
  CircleAlert, Clock3, FileCheck2, MapPin, Megaphone, MonitorPlay, Plus,
  ShieldCheck, TrendingUp, Users, Wallet,
} from 'lucide-react'
import { useCmsData } from '../../data'
import type { CampaignStatus, LocationStatus } from '../../data'
import MockMap from '../../components/MockMap'
import { campaignThumbnails } from '../campaigns/campaignAssets'
import { demoKioskOperations } from '../../data/operations'
import './overview.scss'

const number = new Intl.NumberFormat('vi-VN')
const money = (value: number) => `${new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 1 }).format(value / 1_000_000)} tr`
const shortDate = (value: string) => new Date(`${value}T00:00:00`).toLocaleDateString('vi-VN')
const locationStatus: Record<LocationStatus, string> = {
  draft: 'Bản nháp', pending: 'Chờ duyệt', published: 'Đã xuất bản',
  rejected: 'Từ chối', archived: 'Lưu trữ',
}
const campaignStatus: Record<CampaignStatus, string> = {
  draft: 'Bản nháp', pending: 'Chờ duyệt', scheduled: 'Đã lên lịch',
  active: 'Đang chạy', paused: 'Tạm dừng', completed: 'Hoàn tất', rejected: 'Từ chối',
}

type MetricProps = {
  label: string
  value: string | number
  detail: string
  icon: typeof MapPin
  tone?: 'teal' | 'blue' | 'amber' | 'rose'
}

function Metric({ label, value, detail, icon: Icon, tone = 'teal' }: MetricProps) {
  return <div className={`cms-card cms-metric cms-metric--${tone}`}>
    <div className="cms-metric__top"><span>{label}</span><span className="cms-metric__icon"><Icon size={17} /></span></div>
    <strong>{value}</strong><small>{detail}</small>
  </div>
}

function SectionTitle({ title, to, action = 'Xem tất cả' }: { title: string; to?: string; action?: string }) {
  return <div className="cms-overview__section-title"><h2>{title}</h2>{to && <Link to={to}>{action} <ChevronRight size={14} /></Link>}</div>
}

function CampaignArtwork({ title, compact = false, image = campaignThumbnails[0] }: { title: string; compact?: boolean; image?: string }) {
  return <div className={`cms-campaign-art${compact ? ' cms-campaign-art--compact' : ''}`}>
    <img src={image} alt="" loading="lazy" />
    {!compact && <strong>{title}</strong>}
  </div>
}

export function UserDashboardPage() {
  const { currentUser, locations, campaigns } = useCmsData()
  const mine = locations.filter((item) => item.ownerId === currentUser.id)
  const myCampaigns = campaigns.filter((item) => item.ownerId === currentUser.id)
  const active = myCampaigns.filter((item) => item.status === 'active')
  const pending = mine.filter((item) => item.status === 'pending')
  const featured = active[0] ?? myCampaigns[0]
  const firstName = currentUser.name.trim().split(' ').at(-1) ?? currentUser.name
  return <div className="cms-page cms-overview">
    <div className="cms-page-heading"><div className="cms-page-heading__intro">
      <span className="cms-overview__eyebrow">BẢNG ĐIỀU KHIỂN / VẬN HÀNH TƯƠNG TÁC</span>
      <h1>Chào mừng trở lại, {firstName}</h1>
      <p>Quản lý địa điểm, chiến dịch và theo dõi hiệu quả hiển thị của bạn trong một không gian.</p>
    </div><div className="cms-page-heading__actions">
      <Link className="cms-button cms-button--outline" to="/cms/campaigns/new"><MonitorPlay size={15} /> Tạo chiến dịch Kiosk</Link>
      <Link className="cms-button cms-button--primary" to="/cms/locations/new"><Plus size={15} /> Đăng ký địa điểm</Link>
    </div></div>

    <div className="cms-metrics cms-metrics--four">
      <Metric label="Địa điểm của tôi" value={mine.length} detail={`${mine.filter((item) => item.status === 'published').length} đã xuất bản · ${pending.length} chờ duyệt`} icon={MapPin} />
      <Metric label="Yêu cầu chờ" value={pending.length} detail={pending.length ? 'Cần theo dõi kết quả xét duyệt' : 'Không có yêu cầu đang chờ'} icon={Clock3} tone="rose" />
      <Metric label="Chiến dịch Kiosk hoạt động" value={active.length} detail={`${number.format(active.reduce((sum, item) => sum + item.impressions, 0))} lượt hiển thị`} icon={Megaphone} tone="blue" />
      <Metric label="Độ hiển thị trực tuyến" value={number.format(mine.reduce((sum, item) => sum + item.views, 0))} detail="Lượt xem địa điểm tích lũy" icon={BarChart3} />
    </div>

    <div className="cms-overview__columns">
      <div className="cms-overview__primary">
        <section className="cms-card cms-overview__section">
          <SectionTitle title="Nhiệm vụ & Hành động cần chú ý" to="/cms/locations" action="Quản lý địa điểm" />
          <div className="cms-task-grid">
            <div className="cms-task-card cms-task-card--blue"><span className="cms-badge cms-badge--pending">Đang xét duyệt</span><h3>{pending[0]?.name ?? 'Cập nhật địa điểm mới'}</h3><p>{pending.length ? 'Hồ sơ đã được gửi đến quản lý khu vực. Bạn sẽ nhận được kết quả sau khi kiểm tra.' : 'Thông tin địa điểm của bạn đã được cập nhật.'}</p><Link to={pending[0] ? `/cms/locations/${pending[0].id}` : '/cms/locations'}>Xem hồ sơ <ArrowRight size={14} /></Link></div>
            <div className="cms-task-card cms-task-card--rose"><span className="cms-badge cms-badge--rejected">Đề xuất tiếp theo</span><h3>Kiểm tra lịch hiển thị Kiosk</h3><p>Giữ nội dung và lịch chạy của chiến dịch luôn sẵn sàng trước khi gửi xét duyệt.</p><Link to="/cms/campaigns">Xem chiến dịch <ArrowRight size={14} /></Link></div>
          </div>
        </section>
        <section className="cms-card cms-overview__section">
          <SectionTitle title="Hoạt động địa điểm gần đây" to="/cms/locations" />
          <div className="cms-table-wrap"><table className="cms-table"><thead><tr><th>Địa điểm</th><th>Khu vực</th><th>Trạng thái</th><th>Lượt xem</th><th></th></tr></thead><tbody>
            {mine.slice(0, 5).map((item) => <tr key={item.id}><td><Link className="cms-overview__entity" to={`/cms/locations/${item.id}`}><span className="cms-overview__entity-icon"><MapPin size={15} /></span><span><strong>{item.name}</strong><small>{item.category}</small></span></Link></td><td>{item.district}, {item.city}</td><td><span className={`cms-badge cms-badge--${item.status}`}>{locationStatus[item.status]}</span></td><td>{number.format(item.views)}</td><td><Link className="cms-overview__row-link" to={`/cms/locations/${item.id}`} aria-label={`Xem ${item.name}`}><ChevronRight size={16} /></Link></td></tr>)}
          </tbody></table></div>
          {mine.length === 0 && <div className="cms-empty">Chưa có địa điểm. <Link to="/cms/locations/new">Đăng ký ngay</Link></div>}
        </section>
      </div>
      <aside className="cms-overview__aside">
        <section className="cms-card cms-overview__section cms-overview__feature"><SectionTitle title="Nhịp độ chiến dịch" to="/cms/campaigns" /><CampaignArtwork title={featured?.creativeTitle ?? 'Nội dung của bạn trên Kiosk'} /><div className="cms-overview__feature-body"><strong>{featured?.name ?? 'Chưa có chiến dịch'}</strong><p>{featured?.description ?? 'Tạo chiến dịch đầu tiên để quảng bá địa điểm trên mạng lưới Kiosk.'}</p><div><span>{number.format(featured?.impressions ?? 0)} hiển thị</span><span>{number.format(featured?.clicks ?? 0)} tương tác</span></div></div></section>
        <section className="cms-card cms-overview__section"><SectionTitle title="Hóa đơn gần đây" to="/cms/campaigns" action="Xem chiến dịch" /><div className="cms-overview__invoice-list">{myCampaigns.slice(0, 3).map((item) => <Link key={item.id} to={`/cms/campaigns/${item.id}`}><span><Wallet size={16} /></span><span><strong>{item.name}</strong><small>{shortDate(item.updatedAt)}</small></span><b>{money(item.budget)}</b></Link>)}</div></section>
        <Link to="/cms/campaigns/new" className="cms-overview__tip"><Megaphone size={19} /><strong>Thông điệp xuất hiện tại Kiosk</strong><span>Phủ sóng đúng khu vực và theo dõi hiệu quả chiến dịch theo thời gian.</span><b>Tạo chiến dịch <ArrowRight size={15} /></b></Link>
      </aside>
    </div>
  </div>
}

export function AreaDashboardPage() {
  const navigate = useNavigate()
  const { users, locations, campaigns, kioskRequests, moderationItems, reviewModerationItem } = useCmsData()
  const pendingLocations = moderationItems.filter((item) => item.status === 'pending')
  const pendingKiosks = kioskRequests.filter((item) => item.status === 'pending')
  const published = locations.filter((item) => item.status === 'published')
  const covered = locations.filter((item) => item.managerId && item.status === 'published')
  return <div className="cms-page cms-overview">
    <div className="cms-page-heading"><div className="cms-page-heading__intro"><span className="cms-overview__eyebrow">QUẢN LÝ KHU VỰC / GIÁM SÁT & ĐIỀU PHỐI</span><h1>Trung tâm Điều phối & Bảo vệ Địa Tây</h1><p>Theo dõi yêu cầu địa điểm, nội dung Kiosk và tình trạng vận hành trong khu vực.</p></div><div className="cms-page-heading__actions"><Link className="cms-button cms-button--outline" to="/cms/moderation/locations">Xem hàng đợi</Link><Link className="cms-button cms-button--primary" to="/cms/moderation/kiosks"><ShieldCheck size={15} /> Duyệt Kiosk</Link></div></div>
    <div className="cms-metrics cms-metrics--four"><Metric label="Địa điểm chờ duyệt" value={pendingLocations.length} detail="Hồ sơ cần xác minh" icon={MapPin} tone="rose" /><Metric label="Yêu cầu Kiosk" value={pendingKiosks.length} detail="Chờ kiểm tra kỹ thuật" icon={MonitorPlay} tone="blue" /><Metric label="Kiosk trực tuyến" value={`${demoKioskOperations.onlineStations}/${demoKioskOperations.totalStations}`} detail={`${covered.length} địa điểm thuộc khu vực`} icon={CheckCircle2} /><Metric label="Tải mạng lưới" value={`${demoKioskOperations.averageLoad}%`} detail={`SLA xét duyệt ${demoKioskOperations.targetSlaHours} giờ`} icon={TrendingUp} /></div>
    <div className="cms-overview__columns"><div className="cms-overview__primary">
      <section className="cms-card cms-overview__section"><SectionTitle title="Hàng đợi điểm cần duyệt" to="/cms/moderation/locations" /><div className="cms-table-wrap"><table className="cms-table"><thead><tr><th>Địa điểm</th><th>Người gửi</th><th>Ngày gửi</th><th>Trạng thái</th><th>Thao tác</th></tr></thead><tbody>{pendingLocations.slice(0, 4).map((item) => { const location = locations.find((x) => x.id === item.locationId); const submitter = users.find((x) => x.id === item.submitterId); return <tr key={item.id}><td><strong>{location?.name ?? item.title}</strong><br /><small>{location?.district}, {location?.city}</small></td><td>{submitter?.name ?? 'Người dùng'}</td><td>{shortDate(item.submittedAt)}</td><td><span className="cms-badge cms-badge--pending">Chờ duyệt</span></td><td><div className="cms-overview__row-actions"><button type="button" title="Duyệt" onClick={() => reviewModerationItem(item.id, 'approved')}><CheckCircle2 size={15} /></button><button type="button" title="Xem chi tiết" onClick={() => navigate('/cms/moderation/locations')}><ChevronRight size={15} /></button></div></td></tr> })}</tbody></table></div>{!pendingLocations.length && <div className="cms-empty">Đã xử lý hết hồ sơ địa điểm.</div>}</section>
      <section className="cms-card cms-overview__section"><SectionTitle title="Hàng đợi kiểm duyệt chiến dịch Kiosk" to="/cms/moderation/kiosks" /> <div className="cms-overview__request-list">{pendingKiosks.slice(0, 3).map((item, index) => { const campaign = campaigns.find((x) => x.id === item.campaignId); const location = locations.find((x) => x.id === item.locationId); return <div className="cms-overview__request" key={item.id}><CampaignArtwork title={campaign?.creativeTitle ?? item.title} compact image={campaignThumbnails[index % campaignThumbnails.length]} /><div><span className="cms-badge cms-badge--pending">Cần duyệt</span><h3>{item.title}</h3><p>{location?.name} · {item.durationDays} ngày hiển thị</p><small>{item.message}</small></div><div className="cms-overview__request-actions"><Link className="cms-button cms-button--primary cms-button--small" to={`/cms/moderation/kiosks?request=${item.id}`}>Kiểm tra</Link></div></div> })}</div>{!pendingKiosks.length && <div className="cms-empty">Không có yêu cầu Kiosk đang chờ.</div>}</section>
    </div><aside className="cms-overview__aside">
      <section className="cms-card cms-overview__section"><SectionTitle title="Phân bố Kiosk & Điểm cần giám sát" to="/cms/locations" /><MockMap className="cms-overview__map-frame" locations={locations.filter((item) => item.status === 'published')} height={216} onSelect={(item) => navigate(`/cms/locations/${item.id}`)} /><div className="cms-overview__map-legend"><span><i /> Địa điểm đã duyệt</span><span><i /> Kiosk đang hoạt động</span></div></section>
      <section className="cms-card cms-overview__section"><SectionTitle title="Tải phát sóng trong vùng" /><div className="cms-overview__zone-load">{demoKioskOperations.zones.map((zone) => <div key={zone.id}><span><strong>{zone.name}</strong><small>{zone.online}/{zone.stations} Kiosk trực tuyến</small></span><div><meter min="0" max="100" value={zone.load}>{zone.load}%</meter><b>{zone.load}%</b></div></div>)}</div></section>
      <section className="cms-card cms-overview__section"><SectionTitle title="Nhật ký thao tác gần đây" /><div className="cms-overview__activity"><p><span className="cms-overview__activity-dot" />{pendingLocations.length} địa điểm đang chờ kiểm duyệt</p><p><span className="cms-overview__activity-dot cms-overview__activity-dot--blue" />{pendingKiosks.length} yêu cầu Kiosk đang chờ</p><p><span className="cms-overview__activity-dot cms-overview__activity-dot--amber" />{published.length} địa điểm đã xuất bản</p></div></section>
    </aside></div>
  </div>
}

export function AdminDashboardPage() {
  const navigate = useNavigate()
  const { users, locations, campaigns, kioskRequests, moderationItems } = useCmsData()
  const pendingLocations = moderationItems.filter((item) => item.status === 'pending')
  const pendingKiosks = kioskRequests.filter((item) => item.status === 'pending')
  const activeCampaigns = campaigns.filter((item) => item.status === 'active')
  const revenue = campaigns.reduce((sum, item) => sum + item.spent, 0)
  const activity = useMemo(() => [...moderationItems.map((item) => ({ id: item.id, title: item.title, date: item.submittedAt, kind: 'Địa điểm' })), ...kioskRequests.map((item) => ({ id: item.id, title: item.title, date: item.submittedAt, kind: 'Kiosk' }))].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5), [moderationItems, kioskRequests])
  return <div className="cms-page cms-overview">
    <div className="cms-page-heading"><div className="cms-page-heading__intro"><span className="cms-overview__eyebrow">QUẢN TRỊ HỆ THỐNG / TỔNG QUAN MẠNG LƯỚI</span><h1>Bảng điều khiển Quản trị viên</h1><p>Giám sát địa điểm, chiến dịch, người dùng và luồng kiểm duyệt trên toàn hệ thống.</p></div><div className="cms-page-heading__actions"><Link className="cms-button cms-button--outline" to="/cms/users"><Users size={15} /> Quản lý người dùng</Link><Link className="cms-button cms-button--primary" to="/cms/moderation/locations"><ShieldCheck size={15} /> Xử lý yêu cầu</Link></div></div>
    <div className="cms-metrics cms-metrics--five"><Metric label="Tổng người dùng" value={number.format(users.length)} detail={`${users.filter((item) => item.status === 'active').length} đang hoạt động`} icon={Users} /><Metric label="Địa điểm hiện có" value={number.format(locations.length)} detail={`${locations.filter((item) => item.status === 'published').length} đã xuất bản`} icon={MapPin} tone="blue" /><Metric label="Yêu cầu chờ duyệt" value={pendingLocations.length + pendingKiosks.length} detail="Địa điểm & nội dung Kiosk" icon={CircleAlert} tone="rose" /><Metric label="Kiosk trực tuyến" value={`${demoKioskOperations.onlineStations}/${demoKioskOperations.totalStations}`} detail="Mạng lưới trạm hoạt động" icon={MonitorPlay} /><Metric label="Doanh thu mô phỏng" value={money(revenue)} detail="Dữ liệu demo từ chiến dịch" icon={Wallet} tone="blue" /></div>
    <div className="cms-overview__columns"><div className="cms-overview__primary">
      <section className="cms-card cms-overview__section"><SectionTitle title="Hàng đợi kiểm duyệt cấp cao & Phân bổ công việc" to="/cms/moderation/locations" /><div className="cms-table-wrap"><table className="cms-table"><thead><tr><th>Loại yêu cầu</th><th>Đối tượng</th><th>Ngày gửi</th><th>Mức độ</th><th>Thao tác</th></tr></thead><tbody>{pendingLocations.slice(0, 2).map((item) => <tr key={item.id}><td><span className="cms-badge cms-badge--pending">Địa điểm</span></td><td><strong>{item.title}</strong></td><td>{shortDate(item.submittedAt)}</td><td>Ưu tiên</td><td><Link className="cms-button cms-button--outline cms-button--small" to="/cms/moderation/locations">Xử lý</Link></td></tr>)}{pendingKiosks.slice(0, 2).map((item) => <tr key={item.id}><td><span className="cms-badge cms-badge--scheduled">Kiosk</span></td><td><strong>{item.title}</strong></td><td>{shortDate(item.submittedAt)}</td><td>Tiêu chuẩn</td><td><Link className="cms-button cms-button--outline cms-button--small" to="/cms/moderation/kiosks">Xử lý</Link></td></tr>)}</tbody></table></div>{pendingLocations.length + pendingKiosks.length === 0 && <div className="cms-empty">Không còn yêu cầu cần xử lý.</div>}</section>
      <section className="cms-card cms-overview__section"><SectionTitle title="Chiến dịch Kiosk quy mô lớn đang hoạt động" to="/cms/campaigns" /><div className="cms-overview__campaign-grid">{activeCampaigns.slice(0, 2).map((item, index) => <Link to={`/cms/campaigns/${item.id}`} className="cms-overview__campaign-card" key={item.id}><CampaignArtwork title={item.creativeTitle} compact image={campaignThumbnails[index % campaignThumbnails.length]} /><div><span className="cms-badge cms-badge--active">Đang chạy</span><h3>{item.name}</h3><p>{item.description}</p><strong>{number.format(item.impressions)} hiển thị <ArrowRight size={14} /></strong></div></Link>)}</div></section>
      <section className="cms-card cms-overview__section"><SectionTitle title="Bản đồ phân bổ điểm trọng yếu & Lưu lượng đô thị" to="/cms/locations" action="Xem địa điểm" /><MockMap className="cms-overview__map-frame" locations={locations.filter((item) => item.status === 'published')} height={260} onSelect={(item) => navigate(`/cms/locations/${item.id}`)} /></section>
    </div><aside className="cms-overview__aside">
      <section className="cms-card cms-overview__section"><SectionTitle title="Sức khỏe hệ thống Kiosk" /><div className="cms-overview__health"><div><Activity size={19} /><span><strong>{demoKioskOperations.onlineStations}/{demoKioskOperations.totalStations} trạm trực tuyến</strong><small>{activeCampaigns.length} chiến dịch đang phát</small></span><b>Ổn định</b></div>{demoKioskOperations.zones.map((zone) => <div key={zone.id}><MonitorPlay size={18} /><span><strong>{zone.name}</strong><small>{zone.online}/{zone.stations} thiết bị · tải {zone.load}%</small></span><b className={zone.online < zone.stations ? 'cms-overview__attention' : ''}>{zone.online < zone.stations ? 'Cần kiểm tra' : 'Hoạt động'}</b></div>)}</div></section>
      <section className="cms-card cms-overview__section"><SectionTitle title="Nhật ký quản trị & Bảo mật" /><div className="cms-overview__activity">{activity.map((item) => <p key={item.id}><span className="cms-overview__activity-dot" /><span><strong>{item.kind}</strong> · {item.title}<small>{shortDate(item.date)}</small></span></p>)}</div></section>
      <section className="cms-card cms-overview__section"><SectionTitle title="Phím tắt quản trị" /><div className="cms-overview__shortcuts"><Link to="/cms/users"><Users size={16} /> Quản lý người dùng <ChevronRight size={15} /></Link><Link to="/cms/moderation/locations"><FileCheck2 size={16} /> Duyệt địa điểm <ChevronRight size={15} /></Link><Link to="/cms/moderation/kiosks"><MonitorPlay size={16} /> Duyệt Kiosk <ChevronRight size={15} /></Link><Link to="/cms/campaigns"><CalendarDays size={16} /> Xem chiến dịch <ChevronRight size={15} /></Link></div></section>
    </aside></div>
  </div>
}
