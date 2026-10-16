import { useEffect, useState, type FormEvent } from 'react'
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom'
import {
  Bell,
  ChevronRight,
  CircleHelp,
  Map,
  MapPin,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  Search,
  X,
} from 'lucide-react'
import { useCmsData } from '../data'
import type { CmsRole } from '../data/types'
import {
  cmsNavigationGroups,
  cmsRoleLabels,
  getCmsHome,
  getCmsPageLabel,
  isCmsNavActive,
} from './cmsNavigation'
import '../styles/index.scss'

function initials(name: string): string {
  return name.trim().split(/\s+/).slice(-2).map((part) => part.charAt(0).toLocaleUpperCase('vi')).join('') || 'GK'
}

export default function CmsShell() {
  const navigate = useNavigate()
  const location = useLocation()
  const { currentUser, moderationItems, kioskRequests, currentRole, setCurrentRole } = useCmsData()
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const [search, setSearch] = useState('')
  const pendingLocations = moderationItems.filter((item) => item.status === 'pending').length
  const pendingKiosks = kioskRequests.filter((item) => item.status === 'pending').length
  const pendingCount = pendingLocations + pendingKiosks
  const pageLabel = getCmsPageLabel(location.pathname)

  useEffect(() => {
    setMobileOpen(false)
    setNotificationsOpen(false)
  }, [location.pathname])

  function changeRole(role: CmsRole) {
    setCurrentRole(role)
    navigate(getCmsHome(role))
  }

  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const query = search.trim()
    if (!query) return
    navigate(`/cms/locations?q=${encodeURIComponent(query)}`)
  }

  const shellClass = [
    'cms-app',
    'cms-shell',
    collapsed ? 'cms-shell--collapsed' : '',
    mobileOpen ? 'cms-shell--mobile-open' : '',
  ].filter(Boolean).join(' ')

  return (
    <div className={shellClass}>
      <button className="cms-sidebar__scrim" type="button" aria-label="Đóng điều hướng" onClick={() => setMobileOpen(false)} />
      <aside className="cms-sidebar" aria-label="Điều hướng CMS">
        <Link className="cms-sidebar__brand" to={getCmsHome(currentRole)} title="GeoKiosk CMS">
          <span className="cms-sidebar__brand-mark"><MapPin size={19} strokeWidth={2.4} /></span>
          <span className="cms-sidebar__brand-text">GeoKiosk<small>CMS &amp; ENGINE</small></span>
        </Link>
        <div className="cms-sidebar__scope"><span>Phạm vi</span><strong><span aria-hidden="true" /> Trung tâm Đô thị</strong></div>
        <nav className="cms-sidebar__nav">
          {cmsNavigationGroups.map((group) => {
            const visibleItems = group.items.filter((item) => item.roles.includes(currentRole))
            if (!visibleItems.length) return null
            return (
              <div className="cms-sidebar__group" key={group.label}>
                <p className="cms-sidebar__group-label">{group.label}{group.label === 'Chính' ? ` (${cmsRoleLabels[currentRole]})` : ''}</p>
                {visibleItems.map((item) => {
                  const Icon = item.icon
                  const active = isCmsNavActive(item, location.pathname)
                  return (
                    <Link
                      key={item.path}
                      className="cms-sidebar__link"
                      to={item.path}
                      title={item.label}
                      aria-current={active ? 'page' : undefined}
                    >
                      <Icon size={18} strokeWidth={1.9} />
                      <span className="cms-sidebar__link-label">{item.label}</span>
                    </Link>
                  )
                })}
              </div>
            )
          })}
        </nav>
        <div className="cms-sidebar__footer">
          <div className="cms-sidebar__connection">
            <div><span>Liên kết thiết bị</span><strong><i /> Trực tuyến</strong></div>
            <small>Độ trễ đồng bộ: 42ms</small>
          </div>
          <div className="cms-sidebar__footer-bottom"><span><CircleHelp size={14} /> Hỗ trợ &amp; Tài liệu</span><span>v3.8.4</span></div>
        </div>
      </aside>

      <div className="cms-shell__main">
        <header className="cms-topbar">
          <div className="cms-topbar__left">
            <button
              className="cms-topbar__toggle"
              type="button"
              aria-label={collapsed ? 'Mở rộng thanh điều hướng' : 'Thu gọn thanh điều hướng'}
              onClick={() => window.innerWidth <= 760 ? setMobileOpen(true) : setCollapsed((value) => !value)}
            >
              <span className="cms-topbar__desktop-menu">{collapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}</span>
              <Menu className="cms-topbar__mobile-menu" size={19} />
            </button>
            <div className="cms-topbar__crumbs"><Map size={16} /><span>Không gian làm việc</span><ChevronRight size={13} /><strong>{pageLabel}</strong></div>
          </div>
          <div className="cms-topbar__right">
            <form className="cms-topbar__search" onSubmit={submitSearch} role="search">
              <Search size={16} aria-hidden="true" />
              <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Tìm kiếm địa điểm, chiến dịch..." aria-label="Tìm kiếm địa điểm" />
            </form>
            <label className="cms-topbar__role"><span>Vai trò:</span>
              <select
                className="cms-topbar__role-select"
                value={currentRole}
                onChange={(event) => changeRole(event.target.value as CmsRole)}
                aria-label="Chuyển vai trò demo"
              >
                <option value="admin">Quản trị viên</option>
                <option value="area_manager">Quản lý khu vực</option>
                <option value="user">Người dùng</option>
              </select>
            </label>
            <div className="cms-topbar__notifications">
              <button
                className="cms-topbar__icon-button"
                type="button"
                aria-label={`Thông báo${pendingCount ? `, ${pendingCount} yêu cầu chờ duyệt` : ''}`}
                aria-expanded={notificationsOpen}
                onClick={() => setNotificationsOpen((value) => !value)}
              >
                <Bell size={18} />{pendingCount > 0 && <i />}
              </button>
              {notificationsOpen && (
                <div className="cms-topbar__popover" role="dialog" aria-label="Thông báo">
                  <div className="cms-topbar__popover-header"><strong>Thông báo</strong><button type="button" aria-label="Đóng thông báo" onClick={() => setNotificationsOpen(false)}><X size={16} /></button></div>
                  {currentRole === 'user' ? (
                    <div className="cms-topbar__popover-empty">Theo dõi địa điểm và chiến dịch của bạn trong bảng điều khiển.</div>
                  ) : (
                    <>
                      <Link to="/cms/moderation/locations"><strong>{pendingLocations}</strong> yêu cầu địa điểm đang chờ duyệt <ChevronRight size={14} /></Link>
                      <Link to="/cms/moderation/kiosks"><strong>{pendingKiosks}</strong> yêu cầu Kiosk đang chờ duyệt <ChevronRight size={14} /></Link>
                    </>
                  )}
                </div>
              )}
            </div>
            <div className="cms-topbar__profile" aria-label={`Tài khoản ${currentUser?.name ?? 'GeoKiosk'}`}>
              {currentUser?.avatarUrl ? <img className="cms-topbar__avatar" src={currentUser.avatarUrl} alt="" /> : <span className="cms-topbar__avatar">{initials(currentUser?.name ?? 'GeoKiosk')}</span>}
              <div className="cms-topbar__identity"><strong>{currentUser?.name ?? 'GeoKiosk'}</strong><small>{currentUser?.organization || cmsRoleLabels[currentRole]}</small></div>
            </div>
          </div>
        </header>
        <main className="cms-shell__content"><Outlet /></main>
      </div>
    </div>
  )
}
