import { ImagePlus, Plus, Smile, Video, X } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import Avatar from '../components/common/Avatar.jsx'
import MediaArt from '../components/common/MediaArt.jsx'
import PostCard from '../features/feed/components/PostCard.jsx'
import {
  LeftSidebar,
  RightSidebar,
} from '../components/layout/FeedSidebars.jsx'
import { useFeed, useStories } from '../hooks/useSocialQueries.js'
import { currentUser } from '../services/mockData.js'
import { useSocialStore } from '../store/useSocialStore.js'

export default function HomePage() {
  const { data: posts = [], isPending: postsPending } = useFeed()
  const { data: stories = [] } = useStories()
  const newPosts = useSocialStore((state) => state.newPosts)
  const addPost = useSocialStore((state) => state.addPost)
  const [composerOpen, setComposerOpen] = useState(false)
  const [draft, setDraft] = useState('')
  const [activeStory, setActiveStory] = useState(null)

  function publish(event) {
    event.preventDefault()
    if (!draft.trim()) return
    addPost(draft.trim())
    setDraft('')
    setComposerOpen(false)
  }

  return (
    <div className="feed-layout">
      <LeftSidebar />
      <main className="feed-main" aria-label="Bảng tin">
        <div className="feed-intro">
          <span className="eyebrow">BẢNG TIN CỦA BẠN</span>
          <h1>
            Chào buổi sáng, Minh Anh <span>✦</span>
          </h1>
          <p>Khám phá những câu chuyện mới từ bạn bè hôm nay.</p>
        </div>
        <section className="stories-section" aria-label="Tin của bạn bè">
          <div className="section-heading">
            <h2>Tin nổi bật</h2>
            <Link to="/reels">Xem tất cả</Link>
          </div>
          <div className="stories-row">
            {stories.map((story, index) => (
              <button
                type="button"
                key={story.id}
                className={`story-card story-card--${story.theme}`}
                onClick={() =>
                  index === 0 ? setComposerOpen(true) : setActiveStory(story)
                }
              >
                {story.theme === 'create' ? (
                  <>
                    <span className="story-card__create">
                      <Avatar person={currentUser} size="lg" />
                      <span>
                        <Plus size={18} />
                      </span>
                    </span>
                    <strong>Tạo tin</strong>
                  </>
                ) : (
                  <>
                    <MediaArt theme={story.theme} compact />
                    <span className="story-card__avatar">
                      <Avatar person={story.author} size="sm" />
                    </span>
                    <strong>{story.label}</strong>
                  </>
                )}
              </button>
            ))}
          </div>
        </section>
        <section className="composer card" aria-label="Tạo bài viết">
          <div className="composer__top">
            <Avatar person={currentUser} size="md" />
            <button type="button" onClick={() => setComposerOpen(true)}>
              Minh Anh ơi, bạn đang nghĩ gì?
            </button>
          </div>
          <div className="composer__actions">
            <button type="button" onClick={() => setComposerOpen(true)}>
              <Video size={22} color="#f04461" /> Video trực tiếp
            </button>
            <button type="button" onClick={() => setComposerOpen(true)}>
              <ImagePlus size={22} color="#39ac69" /> Ảnh/video
            </button>
            <button type="button" onClick={() => setComposerOpen(true)}>
              <Smile size={22} color="#eab444" /> Cảm xúc
            </button>
          </div>
        </section>
        <div className="feed-section-title">
          <h2>Bài viết gần đây</h2>
          <span>✦ Dành cho bạn</span>
        </div>
        {postsPending && (
          <div className="card loading-card">Đang tải bảng tin...</div>
        )}
        {[
          ...newPosts.map((post) => ({ ...post, author: currentUser })),
          ...posts,
        ].map((post) => (
          <PostCard key={post.id} post={post} />
        ))}
      </main>
      <RightSidebar />
      {composerOpen && (
        <div
          className="modal-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setComposerOpen(false)
          }}
        >
          <div
            className="composer-modal"
            role="dialog"
            aria-modal="true"
            aria-label="Tạo bài viết"
          >
            <header>
              <h2>Tạo bài viết</h2>
              <button
                className="icon-button"
                type="button"
                onClick={() => setComposerOpen(false)}
                aria-label="Đóng"
              >
                <X size={21} />
              </button>
            </header>
            <form onSubmit={publish}>
              <div className="composer-modal__author">
                <Avatar person={currentUser} size="md" />
                <div>
                  <strong>{currentUser.name}</strong>
                  <small>👥 Bạn bè</small>
                </div>
              </div>
              <textarea
                autoFocus
                aria-label="Nội dung bài viết"
                placeholder="Minh Anh ơi, bạn đang nghĩ gì?"
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                rows="6"
              />
              <div className="composer-modal__extras">
                <span>Thêm vào bài viết</span>
                <ImagePlus size={22} color="#39ac69" />
                <Smile size={22} color="#eab444" />
              </div>
              <button
                className="primary-button composer-modal__publish"
                type="submit"
                disabled={!draft.trim()}
              >
                Đăng
              </button>
            </form>
          </div>
        </div>
      )}
      {activeStory && (
        <div
          className="story-viewer"
          role="dialog"
          aria-modal="true"
          aria-label={`Tin của ${activeStory.author.name}`}
        >
          <button
            className="story-viewer__close"
            type="button"
            onClick={() => setActiveStory(null)}
            aria-label="Đóng tin"
          >
            <X size={25} />
          </button>
          <div className="story-viewer__content">
            <MediaArt
              theme={activeStory.theme}
              title={activeStory.author.name}
            />
            <div className="story-viewer__identity">
              <Avatar person={activeStory.author} size="sm" />
              <b>{activeStory.author.name}</b>
              <span>Hôm nay</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
