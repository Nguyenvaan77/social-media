import { useQuery } from '@tanstack/react-query'
import { socialService } from '../services/socialService.js'

export const useCurrentUser = () =>
  useQuery({ queryKey: ['currentUser'], queryFn: socialService.getCurrentUser })
export const useFeed = () =>
  useQuery({ queryKey: ['feed'], queryFn: socialService.getFeed })
export const useProfilePosts = () =>
  useQuery({
    queryKey: ['profilePosts'],
    queryFn: socialService.getProfilePosts,
  })
export const useStories = () =>
  useQuery({ queryKey: ['stories'], queryFn: socialService.getStories })
export const usePeople = () =>
  useQuery({ queryKey: ['people'], queryFn: socialService.getPeople })
export const useReels = () =>
  useQuery({ queryKey: ['reels'], queryFn: socialService.getReels })
export const useConversations = () =>
  useQuery({
    queryKey: ['conversations'],
    queryFn: socialService.getConversations,
  })
