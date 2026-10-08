import {
  ArrowDown,
  ArrowUp,
  Heart,
  MessageCircle,
  MoreHorizontal,
  Play,
  Send,
  Volume2,
} from 'lucide-react'
import { useState } from 'react'
import Avatar from '../components/common/Avatar.jsx'
import MediaArt from '../components/common/MediaArt.jsx'
import { useReels } from '../hooks/useSocialQueries.js'
import { useSocialStore } from '../store/useSocialStore.js'

export default function ReelsPage() {
  const { data: reels = [] } = useReels()
  const activeIndex = useSocialStore((state) => state.activeReel)
  const setActiveReel = useSocialStore((state) => state.setActiveReel)
  const following = useSocialStore((state) => state.following)
  const toggleFollow = useSocialStore((state) => state.toggleFollow)
  const [paused, setPaused] = useState(false)
  const [liked, setLiked] = useState({})
  const reel = reels[activeIndex] || reels[0]

  function move(direction) {
    if (!reels.length) return
    setActiveReel((activeIndex + direction + reels.length) % reels.length)
    setPaused(false)
  }

  return (
    <main className="reels-page">
      <aside className="reels-sidebar">
        <span className="eyebrow">KHÁM PHÁ</span>
        <h1>Reels</h1>
        <p>Những khoảnh khắc thú vị được chia sẻ từ cộng đồng.</p>
        <div className="reels-sidebar__menu">
          <b>◉</b> Dành cho bạn
        </div>
        <h2>Gợi ý hôm nay</h2>
        {reels.map((item, index) => (
          <button
            type="button"
            key={item.id}
            onClick={() => setActiveReel(index)}
            className={`reels-preview ${index === activeIndex ? 'is-active' : ''}`}
          >
            <MediaArt theme={item.theme} compact />
            <span>
              <strong>{item.title}</strong>
              <small>{item.author.name}</small>
            </span>
          </button>
        ))}
      </aside>
      <section className="reels-stage" aria-label="Trình xem Reels">
        {reel ? (
          <>
            <div className="reel-player">
              <MediaArt theme={reel.theme} />
              <button
                type="button"
                className="reel-player__toggle"
                onClick={() => setPaused((value) => !value)}
                aria-label={paused ? 'Phát Reel' : 'Tạm dừng Reel'}
              >
                {paused && <Play size={58} fill="white" />}
              </button>
              <div className="reel-player__top">
                <span>
                  REELS <span className="reel-player__progress" />
                </span>
                <button type="button" title="Âm thanh mô phỏng">
                  <Volume2 size={20} />
                </button>
              </div>
              <div className="reel-player__bottom">
                <div className="reel-player__author">
                  <Avatar person={reel.author} size="sm" />
                  <b>{reel.author.name}</b>
                  <button
                    type="button"
                    onClick={() => toggleFollow(reel.author.id)}
                  >
                    {following[reel.author.id] ? 'Đang theo dõi' : 'Theo dõi'}
                  </button>
                </div>
                <h2>{reel.title}</h2>
                <p>♫ {reel.track}</p>
              </div>
            </div>
            <div className="reel-actions">
              <button
                type="button"
                onClick={() =>
                  setLiked((value) => ({
                    ...value,
                    [reel.id]: !value[reel.id],
                  }))
                }
                className={liked[reel.id] ? 'is-liked' : ''}
              >
                <span>
                  <Heart
                    size={26}
                    fill={liked[reel.id] ? 'currentColor' : 'none'}
                  />
                </span>
                <small>{reel.likes}</small>
              </button>
              <button type="button" title="Bình luận sẽ có khi nối API">
                <span>
                  <MessageCircle size={25} />
                </span>
                <small>{reel.comments}</small>
              </button>
              <button
                type="button"
                onClick={() =>
                  navigator.clipboard?.writeText(window.location.href)
                }
              >
                <span>
                  <Send size={25} />
                </span>
                <small>Chia sẻ</small>
              </button>
              <button type="button" title="Thêm tùy chọn">
                <span>
                  <MoreHorizontal size={25} />
                </span>
              </button>
            </div>
            <div className="reel-nav">
              <button
                type="button"
                onClick={() => move(-1)}
                aria-label="Reel trước"
              >
                <ArrowUp size={22} />
              </button>
              <button
                type="button"
                onClick={() => move(1)}
                aria-label="Reel tiếp theo"
              >
                <ArrowDown size={22} />
              </button>
            </div>
          </>
        ) : (
          <p>Đang tải Reels...</p>
        )}
      </section>
    </main>
  )
}
