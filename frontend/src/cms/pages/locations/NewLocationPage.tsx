import { useEffect, useRef, useState, type ChangeEvent, type DragEvent, type FormEvent, type MouseEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import {
  ArrowLeft, Check, CheckCircle2, ChevronRight, CloudUpload, Compass,
  FileImage, LocateFixed, MapPin, Phone, Save, Send, ShieldCheck, X,
} from 'lucide-react'
import { useCmsData } from '../../data'
import { locationCategories } from './locationUtils'
import defaultImage from './assets/location-hero.jpg'
import './locations.scss'

interface LocationForm {
  name: string
  category: string
  description: string
  address: string
  district: string
  city: string
  openingHours: string
  latitude: string
  longitude: string
  imageUrl: string
  rightsConfirmed: boolean
}

const emptyForm: LocationForm = {
  name: '', category: '', description: '', address: '', district: '',
  city: 'TP. Hồ Chí Minh', openingHours: '', latitude: '10.7769',
  longitude: '106.7009', imageUrl: '', rightsConfirmed: false,
}

export default function NewLocationPage() {
  const { currentUser, currentRole, users, locations, addLocation, updateLocation, submitLocationForReview } = useCmsData()
  const [searchParams] = useSearchParams()
  const editId = searchParams.get('edit')
  const existing = locations.find((item) => item.id === editId)
  const contactUser = users.find((item) => item.id === existing?.ownerId) ?? currentUser
  const [form, setForm] = useState<LocationForm>(emptyForm)
  const [error, setError] = useState('')
  const [pin, setPin] = useState({ x: 51, y: 54 })
  const uploadInput = useRef<HTMLInputElement>(null)
  const navigate = useNavigate()

  useEffect(() => {
    setForm(existing ? {
      name: existing.name, category: existing.category, description: existing.description,
      address: existing.address, district: existing.district, city: existing.city,
      openingHours: existing.openingHours ?? '', latitude: String(existing.latitude),
      longitude: String(existing.longitude), imageUrl: existing.imageUrl ?? '',
      rightsConfirmed: true,
    } : emptyForm)
    setError('')
  }, [editId, existing?.id])

  function setField<K extends keyof LocationForm>(key: K, value: LocationForm[K]) {
    setForm((previous) => ({ ...previous, [key]: value }))
    setError('')
  }

  function readImage(file?: File) {
    if (!file) return
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setError('Chỉ hỗ trợ ảnh JPG, PNG hoặc WebP.')
      return
    }
    if (file.size > 600_000) {
      setError('Bản demo lưu ảnh trong trình duyệt; vui lòng chọn ảnh dưới 600 KB hoặc nhập URL ảnh.')
      return
    }
    const reader = new FileReader()
    reader.onload = () => setField('imageUrl', typeof reader.result === 'string' ? reader.result : '')
    reader.readAsDataURL(file)
  }

  function chooseImage(event: ChangeEvent<HTMLInputElement>) {
    readImage(event.target.files?.[0])
  }

  function dropImage(event: DragEvent<HTMLButtonElement>) {
    event.preventDefault()
    readImage(event.dataTransfer.files[0])
  }

  function movePin(event: MouseEvent<HTMLDivElement>) {
    const rect = event.currentTarget.getBoundingClientRect()
    const x = Math.max(12, Math.min(88, ((event.clientX - rect.left) / rect.width) * 100))
    const y = Math.max(14, Math.min(82, ((event.clientY - rect.top) / rect.height) * 100))
    const deltaX = x - pin.x
    const deltaY = y - pin.y
    setPin({ x, y })
    setForm((previous) => ({
      ...previous,
      longitude: (Number(previous.longitude || 106.7009) + deltaX * 0.00002).toFixed(6),
      latitude: (Number(previous.latitude || 10.7769) - deltaY * 0.00002).toFixed(6),
    }))
  }

  function save(submit: boolean) {
    const name = form.name.trim()
    const address = form.address.trim()
    const latitude = Number(form.latitude)
    const longitude = Number(form.longitude)
    if (!name || name.length < 3) return setError('Tên địa điểm cần ít nhất 3 ký tự.')
    if (submit && (!address || !form.category || !form.district.trim() || !form.city.trim())) {
      return setError('Vui lòng điền danh mục, địa chỉ và khu vực trước khi gửi duyệt.')
    }
    if (submit && form.description.trim().length < 20) {
      return setError('Mô tả địa điểm cần ít nhất 20 ký tự trước khi gửi duyệt.')
    }
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude) ||
      latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
      return setError('Tọa độ GPS không hợp lệ.')
    }
    if (submit && !form.rightsConfirmed) return setError('Vui lòng xác nhận quyền đăng tải thông tin địa điểm.')
    if (form.imageUrl.trim() && !/^https?:\/\/|^data:image\/(jpeg|png|webp);base64,/i.test(form.imageUrl.trim())) {
      return setError('URL ảnh cần bắt đầu bằng https:// hoặc dùng tệp ảnh hợp lệ.')
    }

    const manager = currentRole === 'area_manager' ? currentUser : users.find((user) => user.role === 'area_manager' &&
      (form.city.includes('Hà Nội') ? user.organization.includes('Hà Nội') : user.organization.includes('Hồ Chí Minh')))
    const payload = {
      name, address, category: form.category || 'Địa điểm',
      description: form.description.trim(), district: form.district.trim(),
      city: form.city.trim(), openingHours: form.openingHours.trim(),
      latitude, longitude, imageUrl: form.imageUrl.trim() || undefined,
      managerId: existing?.managerId ?? manager?.id,
    }
    if (existing) {
      updateLocation(existing.id, { ...payload, status: submit ? 'pending' : existing.status === 'published' ? 'draft' : existing.status })
      if (submit) submitLocationForReview(existing.id, 'Thông tin địa điểm đã được cập nhật và gửi kiểm duyệt.')
      navigate(`/cms/locations/${existing.id}`, { state: { message: submit ? 'Đã gửi địa điểm để kiểm duyệt.' : 'Đã lưu thay đổi.' } })
    } else {
      const location = addLocation({ ...payload, status: submit ? 'pending' : 'draft' })
      navigate(`/cms/locations/${location.id}`, { state: { message: submit ? 'Đã gửi địa điểm để kiểm duyệt.' : 'Đã lưu bản nháp.' } })
    }
  }

  function submitForm(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    save(true)
  }

  if (editId && (!existing ||
    (currentRole === 'user' && existing.ownerId !== currentUser.id) ||
    (currentRole === 'area_manager' && existing.managerId !== currentUser.id))) {
    return <div className="cms-page"><div className="cms-card cms-empty"><MapPin size={30} /><h3>Không thể chỉnh sửa địa điểm</h3><p>Địa điểm không tồn tại hoặc nằm ngoài phạm vi tài khoản demo hiện tại.</p><Link className="cms-button cms-button--primary" to="/cms/locations">Về danh sách địa điểm</Link></div></div>
  }

  return (
    <form className="cms-page cms-location-form-page" onSubmit={submitForm} noValidate>
      <div className="cms-location-form-page__breadcrumbs"><Link to="/cms/locations">Địa điểm</Link><ChevronRight size={13} /><span>{existing ? 'Chỉnh sửa địa điểm' : 'Đăng ký địa điểm'}</span></div>
      <div className="cms-page-heading cms-location-form-page__heading">
        <div className="cms-page-heading__intro"><h1>{existing ? 'Chỉnh sửa ghim địa điểm' : 'Đăng ký ghim địa điểm mới'}</h1><p>Dữ liệu địa điểm được xác thực trước khi hiển thị trên bản đồ công cộng và hệ thống kiosk.</p></div>
        <div className="cms-page-heading__actions"><span className="cms-location-form-page__step">BƯỚC 01/03 · {existing?.status === 'published' ? 'ĐANG HOẠT ĐỘNG' : 'BẢN NHÁP'}</span><button type="button" className="cms-button cms-button--outline" onClick={() => save(false)}><Save size={15} /> Lưu bản nháp</button><button type="submit" className="cms-button cms-button--primary"><Send size={15} /> Gửi phê duyệt</button></div>
      </div>

      {error && <div className="cms-location-form-page__error" role="alert"><span>{error}</span><button type="button" aria-label="Đóng thông báo" onClick={() => setError('')}><X size={15} /></button></div>}

      <div className="cms-location-form-page__grid">
        <div className="cms-location-form-page__left">
          <section className="cms-card cms-location-form-section">
            <div className="cms-location-form-section__head"><span className="cms-location-form-section__index">A</span><div><h2>Thông tin cơ sở cơ bản</h2><small>Dữ liệu công khai</small></div></div>
            <div className="cms-location-form-section__body">
              <div className="cms-form-grid">
                <div className="cms-field"><label htmlFor="cms-location-name">Tên địa điểm *</label><input id="cms-location-name" className="cms-input" value={form.name} onChange={(event) => setField('name', event.target.value)} placeholder="vd. Trung tâm Sáng tạo An Nhiên" maxLength={100} /></div>
                <div className="cms-field"><label htmlFor="cms-location-category">Danh mục chính *</label><select id="cms-location-category" className="cms-select" value={form.category} onChange={(event) => setField('category', event.target.value)}><option value="">Chọn danh mục</option>{locationCategories.map((item) => <option key={item} value={item}>{item}</option>)}</select></div>
                <div className="cms-field cms-form-grid__full"><label htmlFor="cms-location-description">Mô tả cơ sở <span className="cms-location-form-section__counter">{form.description.length} / 320</span></label><textarea id="cms-location-description" className="cms-textarea" value={form.description} onChange={(event) => setField('description', event.target.value)} placeholder="Tóm tắt ngắn gọn hiển thị trên màn hình cảm ứng kiosk và kết quả tìm kiếm..." rows={3} maxLength={320} /></div>
                <div className="cms-field cms-form-grid__full"><label htmlFor="cms-location-address">Địa chỉ thực tế *</label><input id="cms-location-address" className="cms-input" value={form.address} onChange={(event) => setField('address', event.target.value)} placeholder="Số nhà và tên đường" /></div>
                <div className="cms-field"><label htmlFor="cms-location-district">Quận / Huyện *</label><input id="cms-location-district" className="cms-input" value={form.district} onChange={(event) => setField('district', event.target.value)} placeholder="vd. Quận 1" /></div>
                <div className="cms-field"><label htmlFor="cms-location-city">Thành phố *</label><input id="cms-location-city" className="cms-input" value={form.city} onChange={(event) => setField('city', event.target.value)} placeholder="vd. TP. Hồ Chí Minh" /></div>
                <div className="cms-field"><label htmlFor="cms-location-hours">Lịch hoạt động</label><input id="cms-location-hours" className="cms-input" value={form.openingHours} onChange={(event) => setField('openingHours', event.target.value)} placeholder="Thứ 2 – Chủ nhật: 08:00 – 22:00" /></div>
                <div className="cms-field"><label htmlFor="cms-location-phone">Số điện thoại liên hệ</label><div className="cms-location-form-page__readonly"><Phone size={15} /><input id="cms-location-phone" value={contactUser.phone} readOnly aria-describedby="cms-location-phone-note" /></div><small id="cms-location-phone-note">Lấy từ hồ sơ người sở hữu địa điểm.</small></div>
              </div>
            </div>
          </section>

          <section className="cms-card cms-location-form-section">
            <div className="cms-location-form-section__head"><span className="cms-location-form-section__index">C</span><div><h2>Tư liệu hình ảnh &amp; nội dung</h2><small>Tối ưu hiển thị</small></div></div>
            <div className="cms-location-form-section__body">
              <input ref={uploadInput} className="cms-location-form-page__file" type="file" accept="image/png,image/jpeg,image/webp" onChange={chooseImage} />
              <button type="button" className="cms-location-form-page__upload" onClick={() => uploadInput.current?.click()} onDragOver={(event) => event.preventDefault()} onDrop={dropImage}><CloudUpload size={28} /><strong>Kéo thả ảnh bìa độ phân giải cao tại đây</strong><small>Ảnh JPG, PNG hoặc WebP. Bản demo lưu ảnh nhỏ trong trình duyệt.</small><span>Chọn tệp từ máy</span></button>
              <div className="cms-field"><label htmlFor="cms-location-image-url">Hoặc dán URL hình ảnh</label><input id="cms-location-image-url" className="cms-input" value={form.imageUrl.startsWith('data:') ? '' : form.imageUrl} onChange={(event) => setField('imageUrl', event.target.value)} placeholder="https://..." /></div>
              {form.imageUrl && <div className="cms-location-form-page__media-row"><img src={form.imageUrl} alt="Ảnh bìa địa điểm" /><div><strong>Ảnh bìa địa điểm</strong><small><FileImage size={13} /> Sẵn sàng xem trước</small></div><button type="button" aria-label="Xóa ảnh" onClick={() => setField('imageUrl', '')}><X size={16} /></button></div>}
              <div className="cms-field"><label htmlFor="cms-location-short-intro">Đoạn giới thiệu ngắn trên Kiosk</label><input id="cms-location-short-intro" className="cms-input" value={form.description.slice(0, 80)} onChange={(event) => setField('description', event.target.value + form.description.slice(80))} maxLength={80} placeholder="Một câu giới thiệu nổi bật" /><small>Dùng phần đầu mô tả địa điểm để hiển thị trên màn hình kiosk.</small></div>
            </div>
          </section>

          <section className="cms-card cms-location-form-section">
            <div className="cms-location-form-section__head"><span className="cms-location-form-section__index">D</span><div><h2>Xem lại &amp; Xác thực quyền hạn</h2><small>Quản trị quy chuẩn</small></div></div>
            <div className="cms-location-form-section__body"><label className="cms-location-form-page__rights"><input type="checkbox" checked={form.rightsConfirmed} onChange={(event) => setField('rightsConfirmed', event.target.checked)} /><span><strong>Tôi xác nhận có quyền đăng tải thông tin địa điểm này</strong><small>Thông tin, hình ảnh và vị trí được gửi để quản lý khu vực kiểm duyệt trước khi công bố.</small></span></label><div className="cms-location-form-page__ready"><ShieldCheck size={19} /><span>Sẵn sàng hệ thống: {form.rightsConfirmed && form.name && form.address ? 'Đủ điều kiện gửi kiểm duyệt' : 'Hoàn thiện các trường bắt buộc để gửi duyệt'}</span></div></div>
          </section>
        </div>

        <aside className="cms-location-form-page__right">
          <section className="cms-card cms-location-form-map-card"><div className="cms-card__header"><h2><MapPin size={16} /> Vị trí &amp; Vùng phủ sóng GIS</h2><span className="cms-badge cms-badge--published">Bản đồ mô phỏng</span></div><div className="cms-location-form-map__toolbar"><span><Compass size={14} /> Véc-tơ</span><span>Vệ tinh</span><span>Vùng phủ sóng</span></div><div className="cms-location-form-map" onClick={movePin} role="button" tabIndex={0} aria-label="Chọn vị trí ghim trên bản đồ mô phỏng" onKeyDown={(event) => { if (event.key === 'Enter') setPin({ x: 50, y: 50 }) }}><div className="cms-location-form-map__grid" /><span className="cms-location-form-map__district">KHU VỰC TRUNG TÂM ĐÔ THỊ</span><span className="cms-location-form-map__road cms-location-form-map__road--one" /><span className="cms-location-form-map__road cms-location-form-map__road--two" /><span className="cms-location-form-map__road cms-location-form-map__road--three" /><span className="cms-location-form-map__radius" style={{ left: `${pin.x}%`, top: `${pin.y}%` }} /><span className="cms-location-form-map__pin" style={{ left: `${pin.x}%`, top: `${pin.y}%` }}><MapPin size={22} fill="currentColor" /></span><span className="cms-location-form-map__tip">NHẤP ĐỂ ĐIỀU CHỈNH VỊ TRÍ GHIM</span></div><div className="cms-location-form-map__coords"><div className="cms-field"><label htmlFor="cms-location-lat">Vĩ độ</label><input id="cms-location-lat" className="cms-input" inputMode="decimal" value={form.latitude} onChange={(event) => setField('latitude', event.target.value)} /></div><div className="cms-field"><label htmlFor="cms-location-lng">Kinh độ</label><input id="cms-location-lng" className="cms-input" inputMode="decimal" value={form.longitude} onChange={(event) => setField('longitude', event.target.value)} /></div></div><div className="cms-location-form-map__info"><span><CheckCircle2 size={15} /> Ranh giới không gian: {form.city || 'Chưa xác định'}</span><span><LocateFixed size={15} /> Ghim sẽ được xác thực khi gửi duyệt</span></div></section>
          <section className="cms-card cms-location-form-preview"><div className="cms-card__header"><h2>Mô phỏng màn hình Kiosk cảm ứng</h2><small>1080 × 1920</small></div><div className="cms-location-form-preview__screen"><img src={form.imageUrl || defaultImage} alt="Xem trước nội dung địa điểm" /><div><span>GeoKiosk <i /> TRỰC TIẾP</span><strong>{form.name || 'Tên địa điểm của bạn'}</strong><small>{form.category || 'Danh mục'} · {form.address || 'Địa chỉ địa điểm'}</small><p>{form.description || 'Mô tả ngắn sẽ xuất hiện tại đây khi khách chạm vào ghim trên Kiosk.'}</p></div></div><div className="cms-location-form-preview__footer"><Check size={14} /> Xem trước nội dung địa điểm</div></section>
        </aside>
      </div>

      <div className="cms-location-form-page__footer"><Link to={existing ? `/cms/locations/${existing.id}` : '/cms/locations'} className="cms-button cms-button--ghost"><ArrowLeft size={15} /> Hủy thay đổi</Link><div><button type="button" className="cms-button cms-button--outline" onClick={() => save(false)}><Save size={15} /> Lưu bản nháp</button><button type="submit" className="cms-button cms-button--primary"><Send size={15} /> Gửi phê duyệt</button></div></div>
    </form>
  )
}
