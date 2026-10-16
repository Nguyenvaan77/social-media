import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  AlertCircle, ArrowRight, CheckCircle2, ChevronRight, ClipboardCheck,
  Clock3, Copy, Eye, FileCheck2, MapPin, Search, ShieldCheck, X,
} from 'lucide-react'
import MockMap from '../../components/MockMap'
import { useCmsData } from '../../data'
import type { LocationModeration } from '../../data'
import { formatCmsDate, locationStatusLabels } from './locationUtils'
import review1 from './assets/review-1.jpg'
import review2 from './assets/review-2.jpg'
import review3 from './assets/review-3.jpg'
import './locations.scss'

type QueueFilter = 'pending' | 'all' | 'new' | 'revision'
const pageSize = 4
const rejectionReasons = [
  'Hình ảnh không đạt chuẩn độ phân giải hoặc tỉ lệ hiển thị',
  'Tọa độ ghim không khớp với địa chỉ thực tế',
  'Nội dung quảng bá cần điều chỉnh theo quy chuẩn',
  'Thiếu thông tin xác minh quyền sử dụng địa điểm',
  'Lý do khác',
]

export default function LocationModerationPage() {
  const { currentRole, currentUser, locations, users, moderationItems, reviewModerationItem } = useCmsData()
  const [filter, setFilter] = useState<QueueFilter>('pending')
  const [query, setQuery] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [checkedIds, setCheckedIds] = useState<string[]>([])
  const [page, setPage] = useState(1)
  const [rejectOpen, setRejectOpen] = useState(false)
  const [reason, setReason] = useState(rejectionReasons[0])
  const [note, setNote] = useState('')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const scoped = useMemo(() => moderationItems.filter((item) => {
    const location = locations.find((record) => record.id === item.locationId)
    return Boolean(location) && (currentRole === 'admin' || location?.managerId === currentUser.id)
  }), [moderationItems, locations, currentRole, currentUser.id])

  const filtered = useMemo(() => {
    const text = query.trim().toLocaleLowerCase('vi')
    return scoped.filter((item) => {
      const location = locations.find((record) => record.id === item.locationId)
      const submitter = users.find((user) => user.id === item.submitterId)
      const matchesType = filter === 'all' ||
        (filter === 'pending' && item.status === 'pending') ||
        (filter === 'new' && item.status === 'pending' && item.title.startsWith('Đăng')) ||
        (filter === 'revision' && item.status === 'pending' && !item.title.startsWith('Đăng'))
      const matchesSearch = !text || [item.id, item.title, location?.name, submitter?.name]
        .some((value) => value?.toLocaleLowerCase('vi').includes(text))
      return matchesType && matchesSearch
    }).sort((a, b) => b.submittedAt.localeCompare(a.submittedAt))
  }, [scoped, locations, users, filter, query])

  const currentPage = Math.min(page, Math.max(1, Math.ceil(filtered.length / pageSize)))
  const visible = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize)
  const selected = filtered.find((item) => item.id === selectedId) ?? filtered[0]
  const selectedLocation = locations.find((item) => item.id === selected?.locationId)
  const selectedSubmitter = users.find((item) => item.id === selected?.submitterId)
  const pending = scoped.filter((item) => item.status === 'pending')
  const newCount = pending.filter((item) => item.title.startsWith('Đăng')).length
  const revisionCount = pending.length - newCount

  function chooseFilter(value: QueueFilter) {
    setFilter(value)
    setPage(1)
    setCheckedIds([])
  }

  function approve(item: LocationModeration) {
    if (!window.confirm(`Phê duyệt và xuất bản “${locations.find((location) => location.id === item.locationId)?.name || item.title}”?`)) return
    reviewModerationItem(item.id, 'approved', 'Hồ sơ phù hợp và đã được phê duyệt.')
    setCheckedIds((previous) => previous.filter((id) => id !== item.id))
    setNotice('Đã phê duyệt và xuất bản địa điểm.')
  }

  function approveBatch() {
    const approved = checkedIds.filter((id) => pending.some((item) => item.id === id))
    if (!approved.length || !window.confirm(`Phê duyệt ${approved.length} yêu cầu đã chọn?`)) return
    approved.forEach((id) => reviewModerationItem(id, 'approved', 'Được phê duyệt qua xử lý hàng loạt.'))
    setCheckedIds([])
    setNotice(`Đã phê duyệt ${approved.length} yêu cầu.`)
  }

  function reject() {
    if (!selected) return
    if (!reason.trim()) return setError('Vui lòng chọn nguyên nhân cần khắc phục.')
    const combined = `${reason.trim()}${note.trim() ? ` — ${note.trim()}` : ''}`
    reviewModerationItem(selected.id, 'rejected', combined)
    setRejectOpen(false)
    setNote('')
    setError('')
    setNotice('Đã gửi yêu cầu chỉnh sửa địa điểm.')
  }

  async function copyCoordinates() {
    if (!selectedLocation) return
    try {
      await navigator.clipboard.writeText(`${selectedLocation.latitude}, ${selectedLocation.longitude}`)
      setNotice('Đã sao chép tọa độ GPS.')
    } catch {
      setNotice('Không thể sao chép tọa độ tự động.')
    }
  }

  return (
    <div className="cms-page cms-location-moderation">
      <div className="cms-location-detail__crumbs"><span>Quản lý Khu vực</span><ChevronRight size={13} /><strong>Kiểm duyệt địa điểm</strong></div>
      <div className="cms-page-heading cms-location-moderation__heading"><div className="cms-page-heading__intro"><h1>Hàng đợi kiểm duyệt địa điểm mới &amp; chỉnh sửa</h1><p>Đối chiếu dữ liệu GIS, nội dung và quyền đăng tải trước khi xuất bản.</p></div><div className="cms-page-heading__actions"><span className="cms-location-moderation__scope"><i /> Khu vực đang quản lý</span><button type="button" className="cms-button cms-button--outline" onClick={approveBatch} disabled={!checkedIds.length}><ClipboardCheck size={15} /> Duyệt hàng loạt ({checkedIds.length})</button></div></div>
      {notice && <div className="cms-location-detail__notice" role="status"><CheckCircle2 size={16} />{notice}<button type="button" onClick={() => setNotice('')}>Đóng</button></div>}
      <div className="cms-location-moderation__stats"><div className="cms-card"><small>TỔNG CHỜ DUYỆT</small><strong>{pending.length} <span>yêu cầu</span></strong><p><AlertCircle size={15} /> Cần xử lý trước khi xuất bản</p></div><div className="cms-card"><small>ĐỊA ĐIỂM MỚI ĐĂNG KÝ</small><strong>{newCount} <span>hồ sơ mới</span></strong><p><MapPin size={15} /> Khởi tạo ghim địa điểm</p></div><div className="cms-card"><small>YÊU CẦU CHỈNH SỬA</small><strong>{revisionCount} <span>cập nhật lại</span></strong><p><FileCheck2 size={15} /> Thay đổi dữ liệu hồ sơ</p></div><div className="cms-card"><small>ĐÃ XỬ LÝ</small><strong>{scoped.length - pending.length} <span>hồ sơ</span></strong><p><CheckCircle2 size={15} /> Theo dõi lịch sử kiểm duyệt</p></div></div>

      <div className="cms-location-moderation__workspace"><section className="cms-card cms-location-moderation__queue"><div className="cms-location-moderation__queue-controls"><label className="cms-locations-search"><Search size={16} /><input value={query} onChange={(event) => { setQuery(event.target.value); setPage(1) }} placeholder="Tìm hồ sơ, người gửi, mã yêu cầu..." aria-label="Tìm hồ sơ kiểm duyệt" /></label><div className="cms-location-moderation__filters"><button type="button" className={filter === 'pending' ? 'is-active' : ''} onClick={() => chooseFilter('pending')}>Chờ duyệt ({pending.length})</button><button type="button" className={filter === 'new' ? 'is-active' : ''} onClick={() => chooseFilter('new')}>Địa điểm mới ({newCount})</button><button type="button" className={filter === 'revision' ? 'is-active' : ''} onClick={() => chooseFilter('revision')}>Chỉnh sửa ({revisionCount})</button><button type="button" className={filter === 'all' ? 'is-active' : ''} onClick={() => chooseFilter('all')}>Tất cả</button></div></div><div className="cms-location-moderation__queue-list">{visible.map((item) => {
        const location = locations.find((record) => record.id === item.locationId)
        const submitter = users.find((user) => user.id === item.submitterId)
        return <div key={item.id} className={`cms-location-moderation__queue-card${selected?.id === item.id ? ' is-active' : ''}`}><input type="checkbox" checked={checkedIds.includes(item.id)} disabled={item.status !== 'pending'} onChange={() => setCheckedIds((previous) => previous.includes(item.id) ? previous.filter((id) => id !== item.id) : [...previous, item.id])} aria-label={`Chọn yêu cầu ${item.id}`} /><button type="button" onClick={() => setSelectedId(item.id)}><div><code>#{item.id.toUpperCase()}</code><span className={`cms-badge cms-badge--${item.status}`}>{item.status === 'pending' ? 'Chờ duyệt' : item.status === 'approved' ? 'Đã phê duyệt' : 'Cần chỉnh sửa'}</span></div><h2>{location?.name || item.title}</h2><p>{location?.category} · {location?.city}</p><footer><span>{submitter?.name || 'Người dùng'}</span><small><Clock3 size={12} /> {formatCmsDate(item.submittedAt)}</small></footer></button></div>
      })}{filtered.length === 0 && <div className="cms-empty"><ShieldCheck size={28} /><h3>Không có hồ sơ phù hợp</h3><p>Thử đổi bộ lọc hoặc từ khóa tìm kiếm.</p></div>}</div><div className="cms-location-moderation__queue-footer"><span>Hiển thị {visible.length} / {filtered.length} yêu cầu</span><div><button type="button" disabled={currentPage <= 1} onClick={() => setPage(currentPage - 1)}>Trước</button><button type="button" disabled={currentPage * pageSize >= filtered.length} onClick={() => setPage(currentPage + 1)}>Tiếp</button></div></div></section>

      <section className="cms-card cms-location-moderation__detail">{selected && selectedLocation ? <><div className="cms-location-moderation__detail-head"><div><small>MÃ HỒ SƠ: #{selected.id.toUpperCase()} &nbsp; | &nbsp; DANH MỤC: {selectedLocation.category}</small><h2>{selectedLocation.name}</h2><p>Gửi lúc {formatCmsDate(selected.submittedAt)} · Người đại diện: {selectedSubmitter?.name || 'Chưa xác định'}</p></div><span className={`cms-badge cms-badge--${selected.status}`}>{selected.status === 'pending' ? 'Chờ kiểm định' : selected.status === 'approved' ? 'Đã duyệt' : 'Cần chỉnh sửa'}</span></div><div className="cms-location-moderation__detail-body"><div className="cms-location-moderation__review-progress"><span><ShieldCheck size={16} /> Tiến độ kiểm định</span><strong>3 / 3 tiêu chí</strong><div><i /><i /><i /></div></div><h3><FileCheck2 size={17} /> Dữ liệu khai báo &amp; Đối chiếu không gian <span>Khớp lớp dữ liệu GIS</span></h3><div className="cms-location-moderation__metadata"><div><small>ĐỊA CHỈ THỰC ĐỊA</small><strong>{selectedLocation.address}</strong><span>{selectedLocation.district}, {selectedLocation.city}</span></div><div><small>TỌA ĐỘ GIS CHÍNH XÁC</small><strong>{selectedLocation.latitude.toFixed(6)}° N</strong><span>{selectedLocation.longitude.toFixed(6)}° E <button type="button" onClick={copyCoordinates}><Copy size={12} /> Sao chép</button></span></div><div><small>RANH GIỚI KIỂM TRA</small><strong>{selectedLocation.city}</strong><span>Vùng phủ sóng mô phỏng</span></div><div><small>CHỦ SỞ HỮU HỒ SƠ</small><strong>{selectedSubmitter?.name || 'Chưa xác định'}</strong><span>{selectedSubmitter?.organization || ''}</span></div></div><div className="cms-location-moderation__map-title"><strong>Vị trí thực địa &amp; ghim địa điểm</strong><small>Tỉ lệ chiếu: mô phỏng</small></div><MockMap locations={[selectedLocation]} selectedId={selectedLocation.id} height={190} /><div className="cms-location-moderation__media-title"><strong>Kiểm tra tư liệu hình ảnh &amp; nội dung hiển thị</strong><small>Định dạng tối ưu Kiosk</small></div><div className="cms-location-moderation__media"><div><img src={selectedLocation.imageUrl || review1} alt="Ảnh chính địa điểm" /><span>Không gian chính</span></div><div><img src={review2} alt="Mặt tiền địa điểm" /><span>Mặt tiền lối vào</span></div><div><img src={review3} alt="Hoạt động tại địa điểm" /><span>Không gian hoạt động</span></div></div><div className="cms-location-moderation__policy"><ShieldCheck size={18} /><div><strong>Bản quyền nội dung &amp; quyền đăng tải địa điểm</strong><small>Người gửi đã xác nhận trách nhiệm đối với thông tin và hình ảnh trong hồ sơ.</small></div><span className="cms-badge cms-badge--approved">Đã xác nhận</span></div></div><div className="cms-location-moderation__actions"><button type="button" className="cms-button cms-button--outline" disabled title="Chuyển tiếp cấp cao chưa có trong bản demo"><ArrowRight size={14} /> Chuyển tiếp Admin cấp cao</button><div><Link className="cms-button cms-button--outline" to={`/cms/locations/${selectedLocation.id}`}><Eye size={14} /> Xem địa điểm</Link><button type="button" className="cms-button cms-button--outline cms-location-moderation__reject" disabled={selected.status !== 'pending'} onClick={() => setRejectOpen(true)}><X size={14} /> Từ chối / Yêu cầu sửa đổi</button><button type="button" className="cms-button cms-button--primary" disabled={selected.status !== 'pending'} onClick={() => approve(selected)}><CheckCircle2 size={14} /> Phê duyệt &amp; Xuất bản</button></div></div></> : <div className="cms-empty"><MapPin size={28} /><h3>Chọn một yêu cầu</h3><p>Hồ sơ được chọn sẽ hiển thị tại đây để kiểm định.</p></div>}</section></div>

      {rejectOpen && selected && selectedLocation && <div className="cms-location-moderation__dialog-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setRejectOpen(false) }}><div className="cms-location-moderation__dialog" role="dialog" aria-modal="true" aria-labelledby="cms-location-reject-title" onKeyDown={(event) => { if (event.key === 'Escape') setRejectOpen(false) }}><div className="cms-location-moderation__dialog-head"><div><span><AlertCircle size={20} /></span><div><h2 id="cms-location-reject-title">Yêu cầu chỉnh sửa địa điểm #{selected.id.toUpperCase()}</h2><p>Hồ sơ: {selectedLocation.name}</p></div></div><button type="button" aria-label="Đóng" onClick={() => setRejectOpen(false)}><X size={18} /></button></div><div className="cms-location-moderation__dialog-body"><div className="cms-field"><label htmlFor="cms-location-reject-reason">Nguyên nhân chính cần khắc phục *</label><select id="cms-location-reject-reason" className="cms-select" value={reason} onChange={(event) => { setReason(event.target.value); setError('') }}>{rejectionReasons.map((item) => <option key={item} value={item}>{item}</option>)}</select></div><div className="cms-field"><label htmlFor="cms-location-reject-note">Ghi chú cụ thể gửi đến người dùng</label><textarea id="cms-location-reject-note" className="cms-textarea" value={note} onChange={(event) => setNote(event.target.value)} maxLength={500} rows={4} placeholder="Mô tả rõ nội dung cần bổ sung để người gửi có thể chỉnh sửa..." /><small>{note.length} / 500 ký tự</small></div>{error && <p className="cms-field__error" role="alert">{error}</p>}<p className="cms-location-moderation__dialog-note">Quyết định này sẽ được lưu vào lịch sử kiểm duyệt và địa điểm chuyển sang trạng thái cần chỉnh sửa.</p></div><div className="cms-location-moderation__dialog-footer"><button type="button" className="cms-button cms-button--outline" onClick={() => setRejectOpen(false)}>Hủy bỏ</button><button type="button" className="cms-button cms-button--danger" onClick={reject}>Xác nhận gửi yêu cầu chỉnh sửa</button></div></div></div>}
    </div>
  )
}
