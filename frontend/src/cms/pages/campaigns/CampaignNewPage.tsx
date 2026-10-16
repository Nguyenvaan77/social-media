import { useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  ArrowLeft, ArrowRight, CalendarDays, Check, CheckCircle2, CircleHelp,
  Clock3, CloudUpload, Image as ImageIcon, MapPin, MonitorPlay,
  MousePointer2, Plus, Radio, Save, UploadCloud, Video, X,
} from 'lucide-react'
import { useCmsData } from '../../data'
import type { CreateCampaignInput, KioskCampaign, Location } from '../../data/types'
import { locationThumbnails, newCreative, newZoneMap } from './campaignAssets'
import { formatCampaignMoney } from './campaignUtils'
import './campaigns.scss'

type MediaType = 'video' | 'image' | 'interactive'
type CampaignExtra = {
  kioskIds: string[]
  zone: string
  frequency: number
  mediaType: MediaType
  mediaFileName: string
}
type CampaignWithExtra = KioskCampaign & Partial<CampaignExtra>

const kioskOptions = [
  { id: 'K-102', name: 'Kiosk K-102', location: 'Đại lộ Lê Lợi (Trước ga Metro ngầm)', detail: 'Màn hình kép 75” · ~18.200 người/ngày' },
  { id: 'K-105', name: 'Kiosk K-105', location: 'Trạm Metro Tuyến 1 (Cửa Tây 3)', detail: 'Màn hình cột 85” · ~21.500 người/ngày' },
  { id: 'K-108', name: 'Kiosk K-108', location: 'Ngã tư Công viên 23/9 (Lối đi bộ)', detail: 'Màn hình Totem 65” · ~14.800 người/ngày' },
]

const zones = [
  'Trung tâm Đô thị - Phân khu A1 (Quận 1)',
  'Bờ sông phía Tây - Cụm Bến Bạch Đằng',
  'Khu Đô thị Mới Thủ Thiêm - Trục Tài chính',
]

function addDays(value: string, days: number): string {
  const date = new Date(value + 'T00:00:00')
  date.setDate(date.getDate() + days)
  return date.toISOString().slice(0, 10)
}

const today = new Date().toISOString().slice(0, 10)

export function CampaignNewPage() {
  const navigate = useNavigate()
  const { id } = useParams()
  const {
    campaigns, locations, currentRole, currentUser,
    kioskRequests, addCampaign, updateCampaign, addKioskRequest,
  } = useCmsData()
  const campaign = campaigns.find((item) => item.id === id) as CampaignWithExtra | undefined
  const eligibleLocations = useMemo(() => locations.filter((location) =>
    location.status === 'published' &&
    (currentRole !== 'user' || location.ownerId === currentUser.id || campaign?.locationIds.includes(location.id)),
  ), [locations, currentRole, currentUser.id, campaign])

  const [name, setName] = useState(campaign?.name ?? '')
  const [locationId, setLocationId] = useState(campaign?.locationIds[0] ?? eligibleLocations[0]?.id ?? '')
  const [mediaType, setMediaType] = useState<MediaType>(campaign?.mediaType ?? 'video')
  const [mediaFileName, setMediaFileName] = useState(campaign?.mediaFileName ?? '')
  const [creativeTitle, setCreativeTitle] = useState(campaign?.creativeTitle ?? '')
  const [creativeBody, setCreativeBody] = useState(campaign?.creativeBody ?? '')
  const [zone, setZone] = useState(campaign?.zone ?? zones[0])
  const [selectedKiosks, setSelectedKiosks] = useState<string[]>(campaign?.kioskIds ?? kioskOptions.map((item) => item.id))
  const [startDate, setStartDate] = useState(campaign?.startDate ?? addDays(today, 4))
  const [endDate, setEndDate] = useState(campaign?.endDate ?? addDays(today, 18))
  const [frequency, setFrequency] = useState(campaign?.frequency ?? 12)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const selectedLocation = locations.find((location) => location.id === locationId)
  const duration = Math.max(1, Math.ceil((Date.parse(endDate) - Date.parse(startDate)) / 86_400_000) + 1 || 1)
  const distributionCost = selectedKiosks.length * 1_050_000
  const mediaCost = mediaType === 'interactive' ? 300_000 : 650_000
  const primeCost = frequency === 24 ? 800_000 : frequency === 12 ? 400_000 : 0
  const estimatedCost = distributionCost + mediaCost + primeCost

  function toggleKiosk(kioskId: string) {
    setSelectedKiosks((current) => current.includes(kioskId)
      ? current.filter((item) => item !== kioskId)
      : [...current, kioskId])
  }

  function createPayload(status: 'draft' | 'pending'): CreateCampaignInput & CampaignExtra {
    return {
      name: name.trim() || 'Chiến dịch Kiosk chưa đặt tên',
      description: creativeBody.trim(),
      creativeTitle: creativeTitle.trim(),
      creativeBody: creativeBody.trim(),
      locationIds: locationId ? [locationId] : [],
      ownerId: campaign?.ownerId ?? currentUser.id,
      status,
      startDate,
      endDate,
      budget: estimatedCost,
      spent: campaign?.spent ?? 0,
      impressions: campaign?.impressions ?? 0,
      clicks: campaign?.clicks ?? 0,
      kioskIds: selectedKiosks,
      zone,
      frequency,
      mediaType,
      mediaFileName,
    }
  }

  function validate(): boolean {
    const next: Record<string, string> = {}
    if (!name.trim()) next.name = 'Vui lòng nhập tên chiến dịch.'
    if (!locationId) next.location = 'Chọn một địa điểm đã được phê duyệt.'
    if (!creativeTitle.trim()) next.creativeTitle = 'Nhập tiêu đề hiển thị trên Kiosk.'
    else if (creativeTitle.trim().length > 50) next.creativeTitle = 'Tiêu đề tối đa 50 ký tự.'
    if (!creativeBody.trim()) next.creativeBody = 'Nhập thông điệp chạy trên màn hình.'
    else if (creativeBody.trim().length > 120) next.creativeBody = 'Thông điệp tối đa 120 ký tự.'
    if (selectedKiosks.length === 0) next.kiosks = 'Chọn ít nhất một Kiosk phát sóng.'
    if (!startDate || !endDate) next.dates = 'Chọn ngày bắt đầu và kết thúc.'
    else if (endDate < startDate) next.dates = 'Ngày kết thúc phải từ ngày bắt đầu trở đi.'
    setErrors(next)
    if (Object.keys(next).length) {
      document.getElementById('cms-campaign-form-errors')?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      return false
    }
    return true
  }

  function saveCampaign(status: 'draft' | 'pending') {
    if (status === 'pending' && !validate()) return
    const payload = createPayload(status)
    let savedId = campaign?.id
    if (campaign) {
      updateCampaign(campaign.id, payload)
    } else {
      savedId = addCampaign(payload).id
    }
    if (status === 'pending' && savedId && locationId &&
      !kioskRequests.some((request) => request.campaignId === savedId && request.status === 'pending')) {
      addKioskRequest({
        title: `Duyệt phát sóng: ${payload.name}`,
        locationId,
        campaignId: savedId,
        requesterId: currentUser.id,
        message: `${zone}. ${selectedKiosks.join(', ')}. ${frequency} lượt/giờ. Tư liệu: ${mediaFileName || 'mẫu demo'}.`,
        durationDays: duration,
      })
    }
    navigate(`/cms/campaigns/${savedId}`, {
      state: { notice: status === 'draft' ? 'Đã lưu bản nháp chiến dịch.' : 'Đã gửi chiến dịch để kiểm duyệt.' },
    })
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    saveCampaign('pending')
  }

  function jumpTo(step: number) {
    document.getElementById(`cms-campaign-step-${step}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  if (id && !campaign) return <main className="cms-page cms-campaigns"><div className="cms-card cms-empty">
    <h1>Không tìm thấy chiến dịch</h1><p>Chiến dịch có thể đã bị xóa khỏi dữ liệu demo.</p>
    <Link className="cms-button cms-button--primary" to="/cms/campaigns">Về danh sách</Link>
  </div></main>

  return <main className="cms-page cms-campaigns cms-campaign-new">
    <div className="cms-campaign-breadcrumb">Chiến dịch <span>/</span> <Link to="/cms/campaigns">Danh sách chiến dịch</Link> <span>/</span> <strong>{campaign ? 'Chỉnh sửa' : 'Tạo mới'}</strong></div>
    <header className="cms-page-heading">
      <div className="cms-page-heading__intro">
        <div className="cms-campaign-eyebrow">QUY TRÌNH PHÁT THẢO TỰ ĐỘNG <span>/</span> KÝ HIỆU: {campaign?.id ?? '#CMP-DRAFT'}</div>
        <h1>{campaign ? 'Chỉnh sửa chiến dịch phát sóng Kiosk' : 'Tạo chiến dịch phát sóng Kiosk mới'}</h1>
        <p>Cấu hình tham số phân bổ nội dung không gian, lập lịch phát đa điểm và tối ưu hóa mật độ hiển thị trên mạng lưới Kiosk đô thị.</p>
      </div>
      <div className="cms-page-heading__actions">
        <span className="cms-campaign-sync"><CheckCircle2 size={15} /> Dữ liệu demo lưu trong trình duyệt</span>
        <button className="cms-button cms-button--outline" type="button" onClick={() => jumpTo(2)}><CircleHelp size={15} /> Quy chuẩn 9:16</button>
      </div>
    </header>

    <div className="cms-campaign-steps" aria-label="Các bước tạo chiến dịch">
      {[
        ['Nội dung', 'Chọn tư liệu & Địa điểm'],
        ['Vùng phủ', 'Khu vực & Thiết bị Kiosk'],
        ['Lịch trình', 'Khung giờ & Tần suất phát'],
        ['Ngân sách', 'Xem lại & Dự toán chi phí'],
      ].map(([title, description], index) => <button key={title} type="button" onClick={() => jumpTo(index + 1)}>
        <span className={`cms-campaign-step-number ${index === 0 ? 'is-current' : ''}`}>{index + 1}</span>
        <span><strong>Bước {index + 1} · {title}</strong><small>{description}</small></span>
      </button>)}
    </div>

    <form onSubmit={onSubmit} noValidate>
      <div className="cms-campaign-form-layout">
        <div className="cms-campaign-form-main">
          <div id="cms-campaign-form-errors" aria-live="polite">
            {Object.keys(errors).length > 0 && <div className="cms-campaign-error-summary" role="alert">
              Vui lòng kiểm tra {Object.keys(errors).length} trường cần bổ sung trước khi gửi kiểm duyệt.
            </div>}
          </div>
          <section className="cms-card cms-campaign-section" id="cms-campaign-step-1">
            <div className="cms-campaign-section__heading"><div><span className="cms-campaign-section__number">1</span><h2>Ghim địa điểm gốc được phê duyệt</h2></div><span className="cms-campaign-section__hint"><CheckCircle2 size={14} /> Đã xác minh GIS</span></div>
            <p>Chiến dịch hiển thị sẽ tự động liên kết thẻ thông tin tương tác, chỉ đường và mã QR định vị tới địa điểm đã đăng ký trên GeoKiosk.</p>
            {eligibleLocations.length ? <div className="cms-campaign-location-grid">
              {eligibleLocations.map((location: Location, index) => <button key={location.id} type="button"
                className={`cms-campaign-location-option ${locationId === location.id ? 'is-selected' : ''}`}
                onClick={() => setLocationId(location.id)}>
                <img src={locationThumbnails[index % locationThumbnails.length]} alt="" />
                <span><strong>{location.name}</strong><small>PIN-{location.id.replace(/\D/g, '').padStart(4, '0')} · {location.category}</small>
                  <small>{location.address}, {location.district}</small></span>
                <span className="cms-campaign-radio">{locationId === location.id && <Check size={12} />}</span>
              </button>)}
            </div> : <div className="cms-campaign-empty-option">Chưa có địa điểm được phê duyệt. <Link to="/cms/locations/new">Đăng ký địa điểm mới</Link> để tiếp tục.</div>}
            {errors.location && <small className="cms-field__error">{errors.location}</small>}
          </section>

          <section className="cms-card cms-campaign-section" id="cms-campaign-step-2">
            <div className="cms-campaign-section__heading"><div><span className="cms-campaign-section__number">2</span><h2>Định dạng tư liệu phát sóng <small>(Chuẩn Kiosk 9:16)</small></h2></div><span className="cms-campaign-section__meta">Hỗ trợ: MP4 4K, PNG, Web Card</span></div>
            <div className="cms-campaign-media-types">
              {([
                ['video', Video, 'Video Chuyển động 4K', '2160 × 3840 px · 60 FPS · Tối đa 15s'],
                ['image', ImageIcon, 'Ảnh tĩnh 9:16 Ultra-HD', 'Định dạng HDR · Không nén'],
                ['interactive', MousePointer2, 'Thẻ tương tác GIS', 'Cho phép khách chạm, xem menu'],
              ] as const).map(([value, Icon, title, detail]) => <button key={value} type="button"
                className={`cms-campaign-media-option ${mediaType === value ? 'is-selected' : ''}`}
                onClick={() => setMediaType(value)}><Icon size={19} /><strong>{title}</strong><small>{detail}</small></button>)}
            </div>
            <label className="cms-campaign-upload">
              <input type="file" accept={mediaType === 'video' ? 'video/mp4,video/webm' : 'image/png,image/jpeg,image/webp'} onChange={(event) => setMediaFileName(event.target.files?.[0]?.name ?? '')} />
              <UploadCloud size={24} /><strong>{mediaFileName || 'Tải lên video hoặc kéo thả tư liệu vào đây'}</strong>
              <small>{mediaFileName ? 'Tư liệu được mô phỏng trong bản demo; chỉ tên tệp được lưu.' : 'Chọn tệp từ máy tính để hiển thị tên tệp trong chiến dịch demo.'}</small>
              <span className="cms-button cms-button--outline">{mediaFileName ? 'Thay đổi tệp' : 'Chọn tệp'}</span>
            </label>
            <div className="cms-campaign-field-grid">
              <div className="cms-field"><label htmlFor="campaign-name">Tên chiến dịch *</label>
                <input className="cms-input" id="campaign-name" value={name} onChange={(event) => setName(event.target.value)} placeholder="Ví dụ: Quảng bá Mùa hè & Ẩm thực Metro" />
                {errors.name && <small className="cms-field__error">{errors.name}</small>}</div>
              <div className="cms-field"><label htmlFor="campaign-title">Tiêu đề hiển thị chính trên Kiosk *</label>
                <input className="cms-input" id="campaign-title" maxLength={50} value={creativeTitle} onChange={(event) => setCreativeTitle(event.target.value)} placeholder="Thưởng thức Cold Brew Hạt Geisha Mới" />
                <small>{creativeTitle.length}/50 ký tự</small>{errors.creativeTitle && <small className="cms-field__error">{errors.creativeTitle}</small>}</div>
              <div className="cms-field cms-campaign-field-grid__full"><label htmlFor="campaign-body">Thông điệp dòng chữ chạy (Marquee Ticker) *</label>
                <textarea className="cms-textarea" id="campaign-body" maxLength={120} value={creativeBody} onChange={(event) => setCreativeBody(event.target.value)} placeholder="Ưu đãi đặc biệt khi quét mã QR tại Kiosk..." />
                <small>{creativeBody.length}/120 ký tự</small>{errors.creativeBody && <small className="cms-field__error">{errors.creativeBody}</small>}</div>
            </div>
          </section>

          <section className="cms-card cms-campaign-section" id="cms-campaign-step-3">
            <div className="cms-campaign-section__heading"><div><span className="cms-campaign-section__number">3</span><h2>Phân vùng địa lý & Lưới Kiosk phát sóng</h2></div><span className="cms-campaign-section__meta">Hệ tọa độ: WGS84</span></div>
            <div className="cms-field"><label htmlFor="campaign-zone">Khu vực phát sóng</label>
              <select id="campaign-zone" className="cms-select" value={zone} onChange={(event) => setZone(event.target.value)}>{zones.map((item) => <option key={item}>{item}</option>)}</select></div>
            <div className="cms-campaign-map" style={{ backgroundImage: `url(${newZoneMap})` }}>
              <span className="cms-campaign-map__label"><MapPin size={14} /> {selectedLocation?.name ?? 'Chưa chọn địa điểm'}</span>
              {kioskOptions.map((kiosk, index) => <button key={kiosk.id} type="button"
                className={`cms-campaign-map__pin cms-campaign-map__pin--${index + 1} ${selectedKiosks.includes(kiosk.id) ? 'is-selected' : ''}`}
                onClick={() => toggleKiosk(kiosk.id)} title={kiosk.name}>{kiosk.id}</button>)}
              <div className="cms-campaign-map__radius">Bán kính phát: 250m vòng lặp</div>
            </div>
            <div className="cms-campaign-kiosk-list">
              <div className="cms-campaign-kiosk-list__head"><span>Thiết bị mục tiêu</span><span>Vị trí cụm & Bán kính tiếp cận</span><span>Trạng thái kết nối</span></div>
              {kioskOptions.map((kiosk) => <label className="cms-campaign-kiosk-list__row" key={kiosk.id}>
                <span><input type="checkbox" checked={selectedKiosks.includes(kiosk.id)} onChange={() => toggleKiosk(kiosk.id)} /><MonitorPlay size={16} /><strong>{kiosk.name}</strong></span>
                <span>{kiosk.location}<small>{kiosk.detail}</small></span>
                <span className="cms-campaign-online"><i /> Trực tuyến</span>
              </label>)}
            </div>
            {errors.kiosks && <small className="cms-field__error">{errors.kiosks}</small>}
          </section>

          <section className="cms-card cms-campaign-section" id="cms-campaign-step-4">
            <div className="cms-campaign-section__heading"><div><span className="cms-campaign-section__number">4</span><h2>Lập lịch trình & Tần suất phát sóng</h2></div><span className="cms-campaign-section__meta"><CalendarDays size={14} /> {duration} ngày</span></div>
            <div className="cms-campaign-field-grid">
              <div className="cms-field"><label htmlFor="campaign-start">Ngày bắt đầu phát sóng *</label><input className="cms-input" type="date" id="campaign-start" value={startDate} onChange={(event) => setStartDate(event.target.value)} /></div>
              <div className="cms-field"><label htmlFor="campaign-end">Ngày kết thúc phát sóng *</label><input className="cms-input" type="date" id="campaign-end" min={startDate} value={endDate} onChange={(event) => setEndDate(event.target.value)} /></div>
            </div>
            {errors.dates && <small className="cms-field__error">{errors.dates}</small>}
            <div className="cms-campaign-prime"><Clock3 size={17} /><div><strong>Khung giờ vàng Đô thị (Prime Hours)</strong><span>07:00 – 22:00 (15h/ngày)</span></div></div>
            <div className="cms-campaign-frequency">
              {[
                [6, 'Tiêu chuẩn', 'Mỗi 10 phút lặp 1 lần'],
                [12, 'Tối ưu (Khuyến nghị)', 'Mỗi 5 phút lặp 1 lần'],
                [24, 'Cường độ cao', 'Mỗi 2.5 phút lặp 1 lần'],
              ].map(([value, title, detail]) => <button key={value} type="button"
                className={frequency === value ? 'is-selected' : ''} onClick={() => setFrequency(Number(value))}>
                <strong>{title}</strong><b>{value} lượt / giờ</b><small>{detail}</small>
              </button>)}
            </div>
          </section>
        </div>

        <aside className="cms-campaign-form-side">
          <section className="cms-card cms-campaign-preview">
            <div className="cms-campaign-preview__heading"><span>MÔ PHỎNG TRỰC QUAN KIOSK THỰC TẾ</span><span>Tỉ lệ 9:16 Ultra · 4K HDR</span></div>
            <div className="cms-campaign-preview__device">
              <div className="cms-campaign-preview__screen" style={{ backgroundImage: `url(${newCreative})` }}>
                <div className="cms-campaign-preview__top"><span><MapPin size={10} /> {selectedLocation?.name ?? 'Địa điểm Kiosk'}</span><span>29°C</span></div>
                <div className="cms-campaign-preview__message"><small>MÓN ĐẶC QUYỀN</small>
                  <strong>{creativeTitle || 'Thưởng thức Cold Brew Hạt Geisha Mới'}</strong>
                  <span>{creativeBody || 'Ưu đãi 20% khi quét mã QR check-in tại Kiosk'}</span></div>
                <div className="cms-campaign-preview__qr">▦ <small>QUÉT MÃ TẠI ĐÂY</small></div>
              </div>
            </div>
            <p>Mã hiển thị thiết bị: DISP-P916-LIVE · Bản xem trước demo</p>
          </section>
          <section className="cms-card cms-campaign-estimate">
            <h3>Tóm tắt thông số chiến dịch</h3>
            <div className="cms-campaign-estimate__stats"><div><strong>{selectedKiosks.length}</strong><span>Kiosk phát</span></div>
              <div><strong>{duration}</strong><span>Ngày phát</span></div><div><strong>{Math.round(selectedKiosks.length * 15.1)}K</strong><span>Lượt xem/ngày</span></div></div>
            <dl><div><dt>Mạng lưới phân phối ({selectedKiosks.length} Kiosk):</dt><dd>{formatCampaignMoney(distributionCost)}</dd></div>
              <div><dt>Tư liệu & Đồng bộ GIS:</dt><dd>{formatCampaignMoney(mediaCost)}</dd></div>
              <div><dt>Khung giờ vàng Đô thị:</dt><dd>{formatCampaignMoney(primeCost)}</dd></div></dl>
            <div className="cms-campaign-estimate__total"><span>Tổng ước tính tham khảo<small>VAT 8% đã bao gồm</small></span><strong>{formatCampaignMoney(estimatedCost)}</strong></div>
            <p>Mức giá giả lập cho phiên bản thử nghiệm Prototype.</p>
          </section>
        </aside>
      </div>
      <div className="cms-campaign-form-footer">
        <button className="cms-button cms-button--ghost" type="button" onClick={() => navigate('/cms/campaigns')}><X size={15} /> Hủy bỏ</button>
        <button className="cms-button cms-button--outline" type="button" onClick={() => saveCampaign('draft')}><Save size={15} /> Lưu bản nháp</button>
        <div className="cms-campaign-form-footer__right">
          <button className="cms-button cms-button--outline" type="button" onClick={() => jumpTo(1)}><ArrowLeft size={15} /> Quay lại</button>
          <button className="cms-button cms-button--primary" type="submit"><CloudUpload size={15} /> {campaign ? 'Lưu & gửi duyệt' : 'Gửi chiến dịch để kiểm duyệt'} <ArrowRight size={15} /></button>
        </div>
      </div>
    </form>
  </main>
}
