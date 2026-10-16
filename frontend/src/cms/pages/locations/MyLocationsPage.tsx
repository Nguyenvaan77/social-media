import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import {
  ChevronLeft, ChevronRight, Download, Eye, LayoutList, Map as MapIcon,
  MapPin, Pencil, Plus, Search, Satellite, Trash2,
} from 'lucide-react'
import MockMap from '../../components/MockMap'
import { useCmsData } from '../../data'
import type { Location, LocationStatus } from '../../data'
import { formatCmsDate, formatCount, locationStatusLabels } from './locationUtils'
import thumb1 from './assets/thumb-1.jpg'
import thumb2 from './assets/thumb-2.jpg'
import thumb3 from './assets/thumb-3.jpg'
import thumb4 from './assets/thumb-4.jpg'
import thumb5 from './assets/thumb-5.jpg'
import './locations.scss'

const thumbnails = [thumb1, thumb2, thumb3, thumb4, thumb5]
const pageSize = 6

function exportLocations(rows: Location[]) {
  const cell = (value: string | number) => {
    const text = String(value)
    const safe = /^[=+\-@]/.test(text) ? `\t${text}` : text
    return `"${safe.replaceAll('"', '""')}"`
  }
  const csv = [
    ['Mã PIN', 'Tên địa điểm', 'Danh mục', 'Địa chỉ', 'Quận/Huyện', 'Thành phố', 'Trạng thái', 'Cập nhật'],
    ...rows.map((item) => [item.id, item.name, item.category, item.address, item.district,
      item.city, locationStatusLabels[item.status], item.updatedAt]),
  ].map((row) => row.map(cell).join(',')).join('\r\n')
  const url = URL.createObjectURL(new Blob(['\uFEFF', csv], { type: 'text/csv;charset=utf-8' }))
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = 'geo-kiosk-dia-diem.csv'
  document.body.append(anchor)
  anchor.click()
  anchor.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export default function MyLocationsPage() {
  const { currentRole, currentUser, locations, campaigns, users, deleteLocation } = useCmsData()
  const [searchParams, setSearchParams] = useSearchParams()
  const [status, setStatus] = useState<LocationStatus | 'all'>('all')
  const [city, setCity] = useState('all')
  const [sort, setSort] = useState('newest')
  const [view, setView] = useState<'list' | 'map'>('list')
  const [page, setPage] = useState(1)
  const [selected, setSelected] = useState<string[]>([])
  const [mapSelectedId, setMapSelectedId] = useState<string | null>(null)
  const query = searchParams.get('q') ?? ''

  const scoped = useMemo(() => locations.filter((item) =>
    currentRole === 'admin' ||
    (currentRole === 'area_manager' ? item.managerId === currentUser.id : item.ownerId === currentUser.id),
  ), [currentRole, currentUser.id, locations])

  const filtered = useMemo(() => {
    const lower = query.trim().toLocaleLowerCase('vi')
    return scoped.filter((item) => {
      const matchesQuery = !lower || [item.id, item.name, item.address, item.district,
        item.city, item.category].some((value) => value.toLocaleLowerCase('vi').includes(lower))
      return matchesQuery && (status === 'all' || item.status === status) &&
        (city === 'all' || item.city === city)
    }).sort((a, b) => {
      if (sort === 'name') return a.name.localeCompare(b.name, 'vi')
      if (sort === 'views') return b.views - a.views
      return b.updatedAt.localeCompare(a.updatedAt)
    })
  }, [scoped, query, status, city, sort])

  const cities = [...new Set(scoped.map((item) => item.city))].sort((a, b) => a.localeCompare(b, 'vi'))
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const currentPage = Math.min(page, totalPages)
  const visible = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize)
  const pendingCount = scoped.filter((item) => item.status === 'pending').length
  const rejectedCount = scoped.filter((item) => item.status === 'rejected').length
  const selectedVisible = visible.length > 0 && visible.every((item) => selected.includes(item.id))
  const activeMapLocation = filtered.find((item) => item.id === mapSelectedId) ?? filtered[0]

  function changeQuery(value: string) {
    const next = new URLSearchParams(searchParams)
    if (value.trim()) next.set('q', value)
    else next.delete('q')
    setSearchParams(next, { replace: true })
    setPage(1)
  }

  function toggleSelected(id: string) {
    setSelected((previous) => previous.includes(id)
      ? previous.filter((item) => item !== id)
      : [...previous, id])
  }

  function removeSelected() {
    if (!selected.length || !window.confirm(`Xóa ${selected.length} địa điểm đã chọn?`)) return
    selected.forEach(deleteLocation)
    setSelected([])
    setPage(1)
  }

  return (
    <div className="cms-page cms-locations-page">
      <div className="cms-locations-notice">
        <div className="cms-locations-notice__icon"><Satellite size={21} /></div>
        <div className="cms-locations-notice__copy">
          <div><strong>Danh mục Ghim Không gian</strong><span>Nguồn GIS trực tiếp</span></div>
          <p>Đồng bộ theo thời gian thực trên khắp các kiosk đô thị, điểm giao thông công cộng và cụm màn hình hiển thị.</p>
        </div>
        <div className="cms-locations-notice__chips">
          <small>PHÂN LOẠI:</small>
          <button type="button" onClick={() => { setStatus('pending'); setPage(1) }}><i className="is-pending" />{pendingCount} Chờ kiểm duyệt</button>
          <button type="button" onClick={() => { setStatus('rejected'); setPage(1) }}><i className="is-rejected" />{rejectedCount} Cần chỉnh sửa</button>
        </div>
      </div>

      <div className="cms-page-heading cms-locations-heading">
        <div className="cms-page-heading__intro">
          <div className="cms-locations-heading__title"><h1>Địa điểm của tôi</h1><span>{scoped.length} thực thể</span></div>
          <p>Đăng ký, chỉnh sửa và theo dõi các ghim vật lý cùng nội dung hiển thị trên bản đồ công cộng và hệ thống kiosk.</p>
        </div>
        <div className="cms-page-heading__actions">
          <button className="cms-button cms-button--outline" type="button" onClick={() => exportLocations(filtered)}><Download size={15} /> Xuất CSV</button>
          <Link className="cms-button cms-button--primary" to="/cms/locations/new"><Plus size={16} /> Đăng ký địa điểm</Link>
        </div>
      </div>

      <section className="cms-card cms-locations-filters" aria-label="Bộ lọc địa điểm">
        <div className="cms-locations-filters__row">
          <label className="cms-locations-search"><Search size={17} /><input value={query} onChange={(event) => changeQuery(event.target.value)} placeholder="Tìm theo tên địa điểm, địa chỉ, hoặc mã pin..." aria-label="Tìm địa điểm" /></label>
          <select className="cms-select" value={status} onChange={(event) => { setStatus(event.target.value as LocationStatus | 'all'); setPage(1) }} aria-label="Lọc trạng thái">
            <option value="all">Tất cả trạng thái</option>
            {Object.entries(locationStatusLabels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
          </select>
          <select className="cms-select" value={city} onChange={(event) => { setCity(event.target.value); setPage(1) }} aria-label="Lọc khu vực">
            <option value="all">Tất cả khu vực</option>
            {cities.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
          <select className="cms-select" value={sort} onChange={(event) => setSort(event.target.value)} aria-label="Sắp xếp địa điểm">
            <option value="newest">Cập nhật gần nhất</option><option value="name">Tên A–Z</option><option value="views">Lượt xem nhiều nhất</option>
          </select>
          <div className="cms-locations-view-switch" aria-label="Chế độ xem">
            <button className={view === 'list' ? 'is-active' : ''} type="button" aria-label="Xem danh sách" aria-pressed={view === 'list'} onClick={() => setView('list')}><LayoutList size={17} /></button>
            <button className={view === 'map' ? 'is-active' : ''} type="button" aria-label="Xem bản đồ" aria-pressed={view === 'map'} onClick={() => setView('map')}><MapIcon size={17} /></button>
          </div>
        </div>
        <div className="cms-locations-filters__meta"><span><i /> Đang hiển thị {filtered.length} / {scoped.length} địa điểm</span><span>Trạng thái mạng lưới: Bình thường · Dữ liệu được lưu trên trình duyệt</span><span>Hệ tọa độ: GPS / WGS84</span></div>
      </section>

      {view === 'list' ? (
        <section className="cms-card cms-locations-table-card" aria-label="Danh sách địa điểm">
          {selected.length > 0 && <div className="cms-locations-batch"><strong>Đã chọn {selected.length} địa điểm</strong><button className="cms-button cms-button--danger cms-button--small" type="button" onClick={removeSelected}><Trash2 size={14} /> Xóa đã chọn</button><button className="cms-button cms-button--ghost cms-button--small" type="button" onClick={() => setSelected([])}>Bỏ chọn</button></div>}
          <div className="cms-table-wrap">
            <table className="cms-table cms-locations-table">
              <thead><tr>
                <th><input type="checkbox" aria-label="Chọn trang hiện tại" checked={selectedVisible} onChange={() => setSelected((previous) => selectedVisible ? previous.filter((id) => !visible.some((item) => item.id === id)) : [...new Set([...previous, ...visible.map((item) => item.id)])])} /></th>
                <th>Địa điểm &amp; mã PIN</th><th>Địa chỉ &amp; tọa độ</th><th>Quản lý khu vực</th><th>Trạng thái phê duyệt</th><th>Phân bổ Kiosk</th><th>Cập nhật gần nhất</th><th>Thao tác</th>
              </tr></thead>
              <tbody>{visible.map((item, index) => {
                const manager = users.find((user) => user.id === item.managerId)
                const kioskCount = campaigns.filter((campaign) => campaign.status === 'active' && campaign.locationIds.includes(item.id)).length
                return <tr key={item.id}>
                  <td><input type="checkbox" aria-label={`Chọn ${item.name}`} checked={selected.includes(item.id)} onChange={() => toggleSelected(item.id)} /></td>
                  <td><div className="cms-locations-table__identity"><img src={item.imageUrl || thumbnails[index % thumbnails.length]} alt="" /><div><Link to={`/cms/locations/${item.id}`}>{item.name}</Link><small>{item.category} · <code>{item.id.toUpperCase()}</code></small></div></div></td>
                  <td><div className="cms-locations-table__address"><strong>{item.address}</strong><small>{item.district}, {item.city}</small><code>{item.latitude.toFixed(4)} · {item.longitude.toFixed(4)}</code></div></td>
                  <td>{manager ? <div className="cms-locations-table__manager"><span>{manager.name.split(' ').slice(-2).map((word) => word[0]).join('')}</span><div><strong>{manager.name}</strong><small>{manager.organization}</small></div></div> : <span className="cms-locations-table__muted">Chưa phân công</span>}</td>
                  <td><span className={`cms-badge cms-badge--${item.status}`}>{locationStatusLabels[item.status]}</span></td>
                  <td><span className="cms-locations-kiosk-count">{kioskCount} chiến dịch</span></td>
                  <td><div className="cms-locations-table__date"><strong>{formatCmsDate(item.updatedAt)}</strong><small>{formatCount(item.views)} lượt xem</small></div></td>
                  <td><div className="cms-locations-table__actions"><Link title="Xem chi tiết" to={`/cms/locations/${item.id}`}><Eye size={16} /></Link><Link title="Chỉnh sửa" to={`/cms/locations/new?edit=${item.id}`}><Pencil size={15} /></Link></div></td>
                </tr>
              })}</tbody>
            </table>
          </div>
          {filtered.length === 0 && <div className="cms-empty"><MapPin size={30} /><h3>Không tìm thấy địa điểm</h3><p>Thử tìm bằng tên khác hoặc xóa bộ lọc đang chọn.</p></div>}
          <div className="cms-pagination"><span>Hiển thị {filtered.length ? (currentPage - 1) * pageSize + 1 : 0}–{Math.min(currentPage * pageSize, filtered.length)} trên tổng {filtered.length} mục</span><div className="cms-pagination__buttons"><button type="button" aria-label="Trang trước" disabled={currentPage <= 1} onClick={() => setPage(currentPage - 1)}><ChevronLeft size={15} /></button>{Array.from({ length: totalPages }, (_, index) => <button type="button" key={index} aria-label={`Trang ${index + 1}`} aria-current={currentPage === index + 1 ? 'page' : undefined} onClick={() => setPage(index + 1)}>{index + 1}</button>)}<button type="button" aria-label="Trang tiếp" disabled={currentPage >= totalPages} onClick={() => setPage(currentPage + 1)}><ChevronRight size={15} /></button></div></div>
        </section>
      ) : (
        <section className="cms-locations-map-layout">
          <div className="cms-card cms-locations-map-list"><h2>Ghim trong khu vực</h2>{filtered.map((item) => <button key={item.id} type="button" className={activeMapLocation?.id === item.id ? 'is-active' : ''} onClick={() => setMapSelectedId(item.id)}><MapPin size={16} /><span><strong>{item.name}</strong><small>{item.address}, {item.city}</small></span><span className={`cms-badge cms-badge--${item.status}`}>{locationStatusLabels[item.status]}</span></button>)}{filtered.length === 0 && <div className="cms-empty">Không có ghim phù hợp.</div>}</div>
          <div className="cms-card cms-locations-map-panel"><div className="cms-card__header"><h2>Bản đồ phân bố địa điểm</h2><span>{filtered.length} ghim</span></div><MockMap locations={filtered} selectedId={activeMapLocation?.id} onSelect={(item) => setMapSelectedId(item.id)} height={430} />{activeMapLocation && <div className="cms-locations-map-panel__footer"><div><strong>{activeMapLocation.name}</strong><small>{activeMapLocation.address}, {activeMapLocation.city}</small></div><Link className="cms-button cms-button--primary cms-button--small" to={`/cms/locations/${activeMapLocation.id}`}>Xem chi tiết <ChevronRight size={14} /></Link></div>}</div>
        </section>
      )}
    </div>
  )
}
