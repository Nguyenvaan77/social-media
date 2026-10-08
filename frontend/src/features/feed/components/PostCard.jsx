import {
  Bookmark,
  Globe2,
  MessageCircle,
  MoreHorizontal,
  Send,
  ThumbsUp,
} from 'lucide-react'
import { useState } from 'react'
import Avatar from '../../../components/common/Avatar.jsx'
import MediaArt from '../../../components/common/MediaArt.jsx'
import { useSocialStore } from '../../../store/useSocialStore.js'

const EMPTY_COMMENTS = []

export default function PostCard({ post }) {
  const [comment, setComment] = useState('')
  const [showComments, setShowComments] = useState(false)
  const liked = useSocialStore((state) => !!state.likedPosts[post.id])
  const saved = useSocialStore((state) => !!state.savedPosts[post.id])
  const comments = useSocialStore(
    (state) => state.comments[post.id] || EMPTY_COMMENTS,
  )
  const toggleLike = useSocialStore((state) => state.toggleLike)
  const toggleSave = useSocialStore((state) => state.toggleSave)
  const addComment = useSocialStore((state) => state.addComment)

  function submitComment(event) {
    event.preventDefault()
    if (!comment.trim()) return
    addComment(post.id, comment.trim())
    setComment('')
    setShowComments(true)
  }

  return (
    <article className="post-card card" id={post.id}>
      <div className="post-card__header">
        <Avatar person={post.author} size="md" />
        <div className="post-card__identity">
          <strong>{post.author.name}</strong>
          <span>
            {post.time} · <Globe2 size={13} aria-label={post.audience} />
          </span>
        </div>
        <button
          className={`post-card__more icon-plain ${saved ? 'is-saved' : ''}`}
          type="button"
          aria-label={saved ? 'Bỏ lưu bài viết' : 'Lưu bài viết'}
          onClick={() => toggleSave(post.id)}
          title={saved ? 'Đã lưu' : 'Lưu bài viết'}
        >
          {saved ? (
            <Bookmark size={21} fill="currentColor" />
          ) : (
            <MoreHorizontal size={23} />
          )}
        </button>
      </div>
      <p className="post-card__text">{post.text}</p>
      {post.media && <MediaArt theme={post.media} title={post.mediaTitle} />}
      <div className="post-card__counts">
        <span>
          <span className="like-badge">
            <ThumbsUp size={11} fill="white" />
          </span>
          {post.likes + (liked ? 1 : 0)}
        </span>
        <button
          type="button"
          onClick={() => setShowComments((value) => !value)}
        >
          {post.comments + comments.length} bình luận · {post.shares} lượt chia
          sẻ
        </button>
      </div>
      <div className="post-card__actions">
        <button
          className={liked ? 'is-active' : ''}
          type="button"
          onClick={() => toggleLike(post.id)}
        >
          <ThumbsUp size={19} fill={liked ? 'currentColor' : 'none'} /> Thích
        </button>
        <button
          type="button"
          onClick={() => setShowComments((value) => !value)}
        >
          <MessageCircle size={19} /> Bình luận
        </button>
        <button
          type="button"
          onClick={() =>
            navigator.clipboard?.writeText(
              `${window.location.origin}${window.location.pathname}#${post.id}`,
            )
          }
        >
          <Send size={19} /> Chia sẻ
        </button>
      </div>
      {showComments && (
        <div className="post-card__comments">
          {comments.map((item) => (
            <div className="comment-row" key={item.id}>
              <Avatar
                person={{ name: 'Minh Anh', initials: 'MA', color: 'violet' }}
                size="xs"
              />
              <div>
                <b>Minh Anh</b>
                <span>{item.text}</span>
              </div>
            </div>
          ))}
          <form className="comment-form" onSubmit={submitComment}>
            <Avatar
              person={{ name: 'Minh Anh', initials: 'MA', color: 'violet' }}
              size="xs"
            />
            <input
              aria-label="Viết bình luận"
              placeholder="Viết bình luận..."
              value={comment}
              onChange={(event) => setComment(event.target.value)}
            />
            <button type="submit" aria-label="Gửi bình luận">
              <Send size={18} />
            </button>
          </form>
        </div>
      )}
    </article>
  )
}
