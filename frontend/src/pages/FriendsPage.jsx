import {
  ChevronRight,
  Gift,
  Search,
  Settings2,
  UserRoundPlus,
  UsersRound,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import Avatar from '../components/common/Avatar.jsx'
import MediaArt from '../components/common/MediaArt.jsx'
import { usePeople } from '../hooks/useSocialQueries.js'
import { useSocialStore } from '../store/useSocialStore.js'

export default function FriendsPage() {
  const { data: people = [] } = usePeople()
  const [params] = useSearchParams()
  const [search, setSearch] = useState(params.get('q') || '')
  useEffect(() => {
    setSearch(params.get('q') || '')
  }, [params])
  const added = useSocialStore((state) => state.addedFriends)
  const addFriend = useSocialStore((state) => state.addFriend)
  const filtered = useMemo(
    () =>
      people.filter((person) =>
        person.name
          .toLocaleLowerCase('vi-VN')
          .includes(search.toLocaleLowerCase('vi-VN')),
      ),
    [people, search],
  )

  return (
    <main className="friends-page">
      <aside className="friends-sidebar">
        <div className="friends-sidebar__title">
          <h1>Bạn bè</h1>
          <button type="button" title="Tùy chọn danh sách">
            <Settings2 size={20} />
          </button>
        </div>
        <label className="conversation-search">
          <Search size={18} />
          <input
            aria-label="Tìm kiếm bạn bè"
            placeholder="Tìm kiếm bạn bè"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </label>
        <nav>
          <span className="is-active">
            <span>
              <UsersRound size={22} />
            </span>
            Trang chủ
          </span>
          <span>
            <span>
              <UserRoundPlus size={22} />
            </span>
            Lời mời kết bạn
            <ChevronRight size={18} />
          </span>
          <span>
            <span>
              <UsersRound size={22} />
            </span>
            Gợi ý<ChevronRight size={18} />
          </span>
          <span>
            <span>
              <Gift size={22} />
            </span>
            Sinh nhật
            <ChevronRight size={18} />
          </span>
        </nav>
      </aside>
      <section className="friends-content">
        <div className="friends-hero">
          <div>
            <span className="eyebrow">KẾT NỐI MỚI</span>
            <h2>Thêm bạn, thêm câu chuyện.</h2>
            <p>
              Khám phá những người bạn có thể quen biết và cùng chia sẻ điều thú
              vị.
            </p>
          </div>
          <div className="friends-hero__graphic">
            <span>✦</span>
            <span>✧</span>
            <span>●</span>
          </div>
        </div>
        <div className="friends-content__heading">
          <div>
            <h2>Những người bạn có thể biết</h2>
            <p>Gợi ý dành riêng cho bạn</p>
          </div>
          <span>{filtered.length} gợi ý</span>
        </div>
        <div className="friend-grid">
          {filtered.map((person, index) => (
            <article className="friend-card card" key={person.id}>
              <div className="friend-card__cover">
                <MediaArt
                  theme={
                    [
                      'sunset',
                      'mountain',
                      'lavender',
                      'forest',
                      'creative',
                      'sunset',
                    ][index]
                  }
                  compact
                />
              </div>
              <Avatar
                person={person}
                size="xl"
                className="friend-card__avatar"
              />
              <div className="friend-card__body">
                <h3>{person.name}</h3>
                <p>{person.subtitle}</p>
                <span>{person.mutual} bạn chung</span>
                <button
                  type="button"
                  className={added[person.id] ? 'is-added' : ''}
                  onClick={() => addFriend(person.id)}
                  disabled={!!added[person.id]}
                >
                  <UserRoundPlus size={18} />{' '}
                  {added[person.id] ? 'Đã gửi lời mời' : 'Thêm bạn bè'}
                </button>
              </div>
            </article>
          ))}
        </div>
        {!filtered.length && (
          <div className="empty-state">Không tìm thấy người bạn phù hợp.</div>
        )}
      </section>
    </main>
  )
}
