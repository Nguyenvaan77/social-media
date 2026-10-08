import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export const useSocialStore = create(
  persist(
    (set) => ({
      likedPosts: {},
      savedPosts: {},
      following: {},
      addedFriends: {},
      comments: {},
      newPosts: [],
      sentMessages: {},
      activeConversation: 'linh',
      activeReel: 0,
      toggleLike: (id) =>
        set((state) => ({
          likedPosts: { ...state.likedPosts, [id]: !state.likedPosts[id] },
        })),
      toggleSave: (id) =>
        set((state) => ({
          savedPosts: { ...state.savedPosts, [id]: !state.savedPosts[id] },
        })),
      toggleFollow: (id) =>
        set((state) => ({
          following: { ...state.following, [id]: !state.following[id] },
        })),
      addFriend: (id) =>
        set((state) => ({
          addedFriends: { ...state.addedFriends, [id]: true },
        })),
      addComment: (id, text) =>
        set((state) => ({
          comments: {
            ...state.comments,
            [id]: [...(state.comments[id] || []), { id: Date.now(), text }],
          },
        })),
      addPost: (text) =>
        set((state) => ({
          newPosts: [
            {
              id: `new-${Date.now()}`,
              text,
              time: 'Vừa xong',
              audience: 'Bạn bè',
              likes: 0,
              comments: 0,
              shares: 0,
            },
            ...state.newPosts,
          ],
        })),
      sendMessage: (id, text) =>
        set((state) => ({
          sentMessages: {
            ...state.sentMessages,
            [id]: [
              ...(state.sentMessages[id] || []),
              {
                id: `sent-${Date.now()}`,
                from: 'me',
                text,
                time: new Intl.DateTimeFormat('vi-VN', {
                  hour: '2-digit',
                  minute: '2-digit',
                }).format(new Date()),
              },
            ],
          },
        })),
      setActiveConversation: (id) => set({ activeConversation: id }),
      setActiveReel: (index) => set({ activeReel: index }),
    }),
    { name: 'socially-ui-v1' },
  ),
)
