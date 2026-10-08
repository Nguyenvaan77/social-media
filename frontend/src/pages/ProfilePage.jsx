import {
  BriefcaseBusiness,
  Camera,
  ChevronDown,
  MapPin,
  MessageCircle,
  MoreHorizontal,
  Pencil,
  Plus,
  UsersRound,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import Avatar from '../components/common/Avatar.jsx'
import MediaArt from '../components/common/MediaArt.jsx'
import PostCard from '../features/feed/components/PostCard.jsx'
import { useProfilePosts } from '../hooks/useSocialQueries.js'
import { currentUser, people } from '../services/mockData.js'
import { useSocialStore } from '../store/useSocialStore.js'

export default function ProfilePage() {
  const { data: posts = [] } = useProfilePosts()
  const newPosts = useSocialStore((state) => state.newPosts)
  return (
    <main className="profile-page">
      <div className="profile-top">
        <div className="profile-cover">
          <div className="profile-cover__orb profile-cover__orb--one" />
          <div className="profile-cover__orb profile-cover__orb--two" />
          <span>
            collect moments,
            <br />
            <b>make memories.</b>
          </span>
          <button type="button" className="cover-button" title="Ảnh bìa mẫu">
            <Camera size={17} /> Ảnh bìa
          </button>
        </div>
        <div className="profile-summary">
          <Avatar
            person={currentUser}
            size="xxl"
            className="profile-summary__avatar"
          />
          <div className="profile-summary__info">
            <h1>{currentUser.name}</h1>
            <p>
              {currentUser.followers.toLocaleString('vi-VN')} người theo dõi ·{' '}
              {currentUser.friends.toLocaleString('vi-VN')} bạn bè
            </p>
            <div className="profile-summary__friends">
              {people.slice(0, 5).map((person) => (
                <Avatar key={person.id} person={person} size="xs" />
              ))}
            </div>
          </div>
          <div className="profile-summary__actions">
            <Link className="primary-button" to="/">
              <Plus size={18} /> Tạo bài viết
            </Link>
            <button
              className="secondary-button"
              type="button"
              title="Hồ sơ mẫu đang được xem"
            >
              <Pencil size={17} /> Chỉnh sửa trang cá nhân
            </button>
          </div>
        </div>
        <nav className="profile-tabs" aria-label="Mục trang cá nhân">
          <span className="is-active">Bài viết</span>
          <Link to="/friends">Bạn bè</Link>
          <Link to="/reels">Video</Link>
          <span>Ảnh</span>
          <button type="button" title="Thêm tùy chọn">
            Xem thêm <ChevronDown size={15} />
          </button>
          <button
            type="button"
            className="profile-tabs__more"
            aria-label="Thêm tùy chọn"
          >
            <MoreHorizontal size={22} />
          </button>
        </nav>
      </div>
      <div className="profile-content">
        <aside className="profile-content__left">
          <section className="card profile-panel">
            <h2>Giới thiệu</h2>
            <p className="profile-bio">{currentUser.bio}</p>
            <button
              type="button"
              className="wide-muted-button"
              title="Thông tin hồ sơ mẫu"
            >
              Chỉnh sửa tiểu sử
            </button>
            <div className="profile-facts">
              <div>
                <BriefcaseBusiness size={19} />
                <span>{currentUser.job}</span>
              </div>
              <div>
                <MapPin size={19} />
                <span>
                  Sống tại <b>{currentUser.location}</b>
                </span>
              </div>
              <div>
                <UsersRound size={19} />
                <span>
                  Có {currentUser.friends.toLocaleString('vi-VN')} bạn bè
                </span>
              </div>
            </div>
          </section>
          <section className="card profile-panel">
            <div className="panel-heading">
              <h2>Ảnh</h2>
              <Link to="/reels">Xem tất cả ảnh</Link>
            </div>
            <div className="photo-grid">
              {[
                'sunset',
                'mountain',
                'lavender',
                'creative',
                'forest',
                'sunset',
              ].map((theme, index) => (
                <MediaArt key={`${theme}-${index}`} theme={theme} compact />
              ))}
            </div>
          </section>
          <section className="card profile-panel">
            <div className="panel-heading">
              <h2>Bạn bè</h2>
              <Link to="/friends">Xem tất cả</Link>
            </div>
            <p className="muted-copy">
              {currentUser.friends.toLocaleString('vi-VN')} người bạn
            </p>
            <div className="profile-friend-grid">
              {people.slice(0, 6).map((person) => (
                <Link to="/friends" key={person.id}>
                  <Avatar person={person} size="lg" />
                  <strong>{person.name}</strong>
                </Link>
              ))}
            </div>
          </section>
        </aside>
        <div className="profile-content__right">
          <div className="card profile-posts-heading">
            <h2>Bài viết</h2>
            <button type="button" title="Bài viết mới nhất">
              <MoreHorizontal size={20} /> Bộ lọc
            </button>
          </div>
          {[
            ...newPosts.map((post) => ({ ...post, author: currentUser })),
            ...posts,
          ].map((post) => (
            <PostCard key={post.id} post={post} />
          ))}
        </div>
      </div>
    </main>
  )
}
