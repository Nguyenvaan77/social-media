import {
  ArrowLeft,
  ImagePlus,
  Info,
  MoreHorizontal,
  Phone,
  Search,
  Send,
  Smile,
  Video,
} from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import Avatar from '../components/common/Avatar.jsx'
import { useConversations } from '../hooks/useSocialQueries.js'
import { useSocialStore } from '../store/useSocialStore.js'

export default function MessagesPage() {
  const { data: conversations = [] } = useConversations()
  const activeId = useSocialStore((state) => state.activeConversation)
  const setActiveConversation = useSocialStore(
    (state) => state.setActiveConversation,
  )
  const sentMessages = useSocialStore((state) => state.sentMessages)
  const sendMessage = useSocialStore((state) => state.sendMessage)
  const [search, setSearch] = useState('')
  const [draft, setDraft] = useState('')
  const [mobileThread, setMobileThread] = useState(false)
  const bottomRef = useRef(null)
  const active =
    conversations.find((item) => item.id === activeId) || conversations[0]
  const filtered = conversations.filter((item) =>
    item.person.name
      .toLocaleLowerCase('vi-VN')
      .includes(search.toLocaleLowerCase('vi-VN')),
  )

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: 'end' })
  }, [activeId, sentMessages])

  function submit(event) {
    event.preventDefault()
    if (!draft.trim() || !active) return
    sendMessage(active.id, draft.trim())
    setDraft('')
  }

  return (
    <main
      className={`messages-page ${mobileThread ? 'messages-page--thread-open' : ''}`}
    >
      <aside className="conversation-list">
        <div className="conversation-list__heading">
          <h1>Đoạn chat</h1>
          <button type="button" title="Tùy chọn">
            <MoreHorizontal size={23} />
          </button>
        </div>
        <label className="conversation-search">
          <Search size={18} />
          <input
            aria-label="Tìm kiếm cuộc trò chuyện"
            placeholder="Tìm kiếm trên Messenger"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </label>
        <div className="conversation-list__filter">
          <button type="button" className="is-active">
            Tất cả
          </button>
          <button type="button">Chưa đọc</button>
        </div>
        <div className="conversation-list__items">
          {filtered.map((item) => (
            <button
              type="button"
              className={`conversation-row ${active?.id === item.id ? 'is-active' : ''}`}
              key={item.id}
              onClick={() => {
                setActiveConversation(item.id)
                setMobileThread(true)
              }}
            >
              <Avatar
                person={item.person}
                size="lg"
                online={item.person.online}
              />
              <span className="conversation-row__details">
                <strong>{item.person.name}</strong>
                <small>
                  {(sentMessages[item.id] || []).at(-1)?.text || item.preview}
                </small>
              </span>
              <span className="conversation-row__meta">
                <small>{item.time}</small>
                {item.unread > 0 && <b>{item.unread}</b>}
              </span>
            </button>
          ))}
        </div>
      </aside>
      <section className="message-thread" aria-label="Nội dung cuộc trò chuyện">
        {active && (
          <>
            <header className="message-thread__header">
              <button
                className="message-thread__back"
                type="button"
                onClick={() => setMobileThread(false)}
                aria-label="Quay lại"
              >
                <ArrowLeft size={21} />
              </button>
              <Avatar
                person={active.person}
                size="sm"
                online={active.person.online}
              />
              <div>
                <strong>{active.person.name}</strong>
                <small>
                  {active.person.online
                    ? 'Đang hoạt động'
                    : 'Hoạt động gần đây'}
                </small>
              </div>
              <span className="message-thread__header-actions">
                <button type="button" title="Gọi thoại (sắp ra mắt)" disabled>
                  <Phone size={21} />
                </button>
                <button type="button" title="Gọi video (sắp ra mắt)" disabled>
                  <Video size={22} />
                </button>
                <button type="button" title="Thông tin cuộc trò chuyện">
                  <Info size={22} />
                </button>
              </span>
            </header>
            <div className="message-thread__body">
              <div className="thread-intro">
                <Avatar person={active.person} size="xl" />
                <h2>{active.person.name}</h2>
                <p>Các bạn đã kết nối trên Socially</p>
              </div>
              <span className="thread-day">HÔM NAY</span>
              {[...active.messages, ...(sentMessages[active.id] || [])].map(
                (message) => (
                  <div
                    key={message.id}
                    className={`message-bubble-row ${message.from === 'me' ? 'is-mine' : ''}`}
                  >
                    {message.from !== 'me' && (
                      <Avatar person={active.person} size="xs" />
                    )}
                    <div className="message-bubble" title={message.time}>
                      {message.text}
                    </div>
                  </div>
                ),
              )}
              <div ref={bottomRef} />
            </div>
            <form className="message-compose" onSubmit={submit}>
              <button type="button" title="Đính kèm (sắp ra mắt)" disabled>
                <ImagePlus size={21} />
              </button>
              <label>
                <input
                  aria-label="Nhập tin nhắn"
                  placeholder="Aa"
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                />
                <Smile size={21} />
              </label>
              <button
                type="submit"
                aria-label="Gửi tin nhắn"
                disabled={!draft.trim()}
              >
                <Send size={22} fill={draft.trim() ? 'currentColor' : 'none'} />
              </button>
            </form>
          </>
        )}
      </section>
      <aside className="message-info">
        {active && (
          <>
            <Avatar person={active.person} size="xl" />
            <h2>{active.person.name}</h2>
            <p>
              {active.person.online ? 'Đang hoạt động' : 'Hoạt động gần đây'}
            </p>
            <div className="message-info__buttons">
              <button type="button">
                <Avatar person={active.person} size="xs" /> Trang cá nhân
              </button>
              <button type="button">
                <Search size={17} /> Tìm kiếm
              </button>
            </div>
            <div className="message-info__section">
              <b>Thông tin đoạn chat</b>
              <span>Chủ đề mặc định</span>
            </div>
            <div className="message-info__section">
              <b>File phương tiện & liên kết</b>
              <span>Chưa có file được chia sẻ</span>
            </div>
          </>
        )}
      </aside>
    </main>
  )
}
