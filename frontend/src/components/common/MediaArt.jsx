export default function MediaArt({ theme = 'sunset', title, compact = false }) {
  return (
    <div
      className={`media-art media-art--${theme} ${compact ? 'media-art--compact' : ''}`}
      role="img"
      aria-label={title || 'Ảnh minh họa bài viết'}
    >
      <span className="media-art__sun" />
      <span className="media-art__hill media-art__hill--back" />
      <span className="media-art__hill media-art__hill--front" />
      <span className="media-art__spark media-art__spark--one" />
      <span className="media-art__spark media-art__spark--two" />
      {title && <span className="media-art__caption">{title}</span>}
    </div>
  )
}
