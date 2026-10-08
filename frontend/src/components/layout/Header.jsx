import {
  Bell,
  Clapperboard,
  House,
  Menu,
  MessageCircle,
  Search,
  UsersRound,
} from 'lucide-react'
import { NavLink, useNavigate } from 'react-router-dom'
import Avatar from '../common/Avatar.jsx'
import { currentUser } from '../../services/mockData.js'

const navItems = [
  { to: '/', icon: House, label: 'Trang chủ', end: true },
  { to: '/friends', icon: UsersRound, label: 'Bạn bè' },
  { to: '/reels', icon: Clapperboard, label: 'Reels' },
  { to: '/messages', icon: MessageCircle, label: 'Tin nhắn' },
]

export default function Header() {
  const navigate = useNavigate()
  return (
    <>
      <header className="topbar">
        <div className="topbar__brand">
          <NavLink
            className="brand-mark"
            to="/"
            aria-label="Socially - Trang chủ"
          >
            s
          </NavLink>
          <label className="global-search">
            <Search size={19} strokeWidth={2.2} />
            <input
              aria-label="Tìm kiếm trên Socially"
              placeholder="Tìm kiếm trên Socially"
              onKeyDown={(event) => {
                if (event.key === 'Enter' && event.currentTarget.value.trim())
                  navigate(
                    `/friends?q=${encodeURIComponent(event.currentTarget.value.trim())}`,
                  )
              }}
            />
          </label>
        </div>
        <nav className="topbar__nav" aria-label="Điều hướng chính">
          {navItems.map(({ to, icon: Icon, label, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `topbar__nav-item ${isActive ? 'is-active' : ''}`
              }
              aria-label={label}
              title={label}
            >
              <Icon size={26} strokeWidth={2} />
            </NavLink>
          ))}
        </nav>
        <div className="topbar__actions">
          <button
            className="icon-button topbar__menu"
            type="button"
            aria-label="Mở menu"
            onClick={() => navigate('/friends')}
          >
            <Menu size={22} />
          </button>
          <button
            className="icon-button topbar__messages"
            type="button"
            aria-label="Mở tin nhắn"
            onClick={() => navigate('/messages')}
          >
            <MessageCircle size={22} />
          </button>
          <button
            className="icon-button topbar__notifications"
            type="button"
            aria-label="Thông báo"
            title="Chưa có thông báo mới"
          >
            <Bell size={22} />
          </button>
          <NavLink
            to="/profile"
            aria-label="Trang cá nhân"
            className="topbar__avatar"
          >
            <Avatar person={currentUser} size="sm" />
          </NavLink>
        </div>
      </header>
      <nav className="mobile-nav" aria-label="Điều hướng di động">
        {[...navItems, { to: '/profile', icon: Avatar, label: 'Cá nhân' }].map(
          ({ to, icon: Icon, label, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `mobile-nav__item ${isActive ? 'is-active' : ''}`
              }
              aria-label={label}
            >
              {to === '/profile' ? (
                <Avatar person={currentUser} size="xs" />
              ) : (
                <Icon size={23} />
              )}
            </NavLink>
          ),
        )}
      </nav>
    </>
  )
}
