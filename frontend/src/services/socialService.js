import {
  conversations,
  currentUser,
  people,
  posts,
  profilePosts,
  reels,
  stories,
} from './mockData.js'

// Boundary for future microservice integration. The UI phase intentionally reads
// deterministic fixtures while the feed, reels and messaging APIs are unfinished.
const read = (data) => Promise.resolve(data)

export const socialService = {
  getCurrentUser: () => read(currentUser),
  getFeed: () => read(posts),
  getProfilePosts: () => read(profilePosts),
  getStories: () => read(stories),
  getPeople: () => read(people),
  getReels: () => read(reels),
  getConversations: () => read(conversations),
}
