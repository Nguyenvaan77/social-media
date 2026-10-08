import {
  Bookmark,
  CalendarDays,
  ChevronDown,
  Clapperboard,
  Clock3,
  Gift,
  MessageCircle,
  Search,
  UsersRound,
} from 'lucide-react'
import { NavLink } from 'react-router-dom'
import Avatar from '../common/Avatar.jsx'
import { currentUser } from '../../services/mockData.js'
import { usePeople } from '../../hooks/useSocialQueries.js'

export function LeftSidebar() {
  return (
    <aside className="feed-sidebar feed-sidebar--left" aria-label="Lối tắt">
      <nav className="side-links">
        <NavLink to="/profile" className="side-link">
          <Avatar person={currentUser} size="sm" />
          <span>{currentUser.name}</span>
        </NavLink>
        <NavLink to="/friends" className="side-link">
          <span className="side-link__icon side-link__icon--blue">
            <UsersRound size={23} />
          </span>
          <span>Bạn bè</span>
        </NavLink>
        <NavLink to="/reels" className="side-link">
          <span className="side-link__icon side-link__icon--cyan">
            <Clapperboard size={23} />
          </span>
          <span>Reels</span>
        </NavLink>
        <NavLink to="/messages" className="side-link">
          <span className="side-link__icon side-link__icon--purple">
            <MessageCircle size={23} />
          </span>
          <span>Tin nhắn</span>
        </NavLink>
        <NavLink to="/profile" className="side-link">
          <span className="side-link__icon side-link__icon--indigo">
            <Bookmark size={23} />
          </span>
          <span>Đã lưu</span>
        </NavLink>
        <span className="side-link side-link--muted">
          <span className="side-link__icon side-link__icon--neutral">
            <Clock3 size={22} />
          </span>
          <span>Kỷ niệm</span>
        </span>
        <span className="side-link side-link--muted">
          <span className="side-link__icon side-link__icon--neutral">
            <ChevronDown size={22} />
          </span>
          <span>Xem thêm</span>
        </span>
      </nav>
      <div className="sidebar-divider" />
      <h3 className="sidebar-label">Lối tắt của bạn</h3>
      <div className="shortcut-item">
        <span className="shortcut-tile">✦</span>
        <span>Cộng đồng sáng tạo</span>
      </div>
      <div className="shortcut-item">
        <span className="shortcut-tile shortcut-tile--second">◈</span>
        <span>Du lịch cùng nhau</span>
      </div>
      <p className="sidebar-footer">
        Quyền riêng tư · Điều khoản · Liên hệ
        <br />
        Socially © 2026
      </p>
    </aside>
  )
}

export function RightSidebar() {
  const { data: people = [] } = usePeople()
  return (
    <aside
      className="feed-sidebar feed-sidebar--right"
      aria-label="Liên hệ và sự kiện"
    >
      <h3 className="sidebar-label">Được tài trợ</h3>
      <div className="sponsor-card">
        <div className="sponsor-card__art">
          CREATE
          <br />
          <b>MORE.</b>
        </div>
        <div>
          <strong>Ý tưởng mới mỗi ngày</strong>
          <span>studio.socially.vn</span>
        </div>
      </div>
      <div className="sidebar-divider" />
      <h3 className="sidebar-label">Sinh nhật</h3>
      <div className="birthday-line">
        <Gift size={25} />
        <span>
          <b>Linh Nguyễn</b> và <b>2 người khác</b> có sinh nhật hôm nay.
        </span>
      </div>
      <div className="sidebar-divider" />
      <div className="sidebar-heading">
        <h3 className="sidebar-label">Người liên hệ</h3>
        <div>
          <button
            type="button"
            aria-label="Tìm người liên hệ"
            title="Danh sách liên hệ"
          >
            <Search size={18} />
          </button>
          <button type="button" aria-label="Tùy chọn" title="Tùy chọn">
            <CalendarDays size={18} />
          </button>
        </div>
      </div>
      <div className="contact-list">
        {people.map((person) => (
          <NavLink className="contact" to="/messages" key={person.id}>
            <Avatar person={person} size="sm" online={person.online} />
            <span>{person.name}</span>
          </NavLink>
        ))}
      </div>
    </aside>
  )
}
