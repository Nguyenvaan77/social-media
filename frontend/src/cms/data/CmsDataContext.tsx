import { createContext, useContext, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { createDemoState } from './seed'
import { loadCmsData, saveCmsData } from './storage'
import type {
  CampaignStatus, CmsDataState, CmsRole, CmsUser, CreateCampaignInput,
  CreateKioskRequestInput, CreateLocationInput, CreateModerationInput,
  CreateUserInput, KioskCampaign, KioskRequest, Location, LocationModeration,
  ReviewStatus,
} from './types'

type ReviewDecision = Exclude<ReviewStatus, 'pending'>

export interface CmsDataContextValue extends CmsDataState {
  currentUser: CmsUser
  currentRole: CmsRole
  setCurrentRole: (role: CmsRole) => void
  setCurrentUserId: (id: string) => void
  addLocation: (input: CreateLocationInput) => Location
  updateLocation: (id: string, patch: Partial<Omit<Location, 'id' | 'createdAt'>>) => void
  deleteLocation: (id: string) => void
  submitLocationForReview: (id: string, note?: string) => void
  reviewModerationItem: (id: string, decision: ReviewDecision, note?: string) => void
  addCampaign: (input: CreateCampaignInput) => KioskCampaign
  updateCampaign: (id: string, patch: Partial<Omit<KioskCampaign, 'id' | 'createdAt'>>) => void
  setCampaignStatus: (id: string, status: CampaignStatus) => void
  deleteCampaign: (id: string) => void
  addUser: (input: CreateUserInput) => CmsUser
  updateUser: (id: string, patch: Partial<Omit<CmsUser, 'id' | 'joinedAt'>>) => void
  deleteUser: (id: string) => void
  addKioskRequest: (input: CreateKioskRequestInput) => KioskRequest
  updateKioskRequest: (id: string, patch: Partial<Omit<KioskRequest, 'id' | 'submittedAt'>>) => void
  reviewKioskRequest: (id: string, decision: ReviewDecision, note?: string) => void
  deleteKioskRequest: (id: string) => void
  addModerationItem: (input: CreateModerationInput) => LocationModeration
  updateModerationItem: (id: string, patch: Partial<Omit<LocationModeration, 'id' | 'submittedAt'>>) => void
  deleteModerationItem: (id: string) => void
  resetDemoData: () => void
}

const CmsDataContext = createContext<CmsDataContextValue | null>(null)

let generatedIdSequence = 0
const makeId = (prefix: string): string => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return `${prefix}-${crypto.randomUUID()}`
  }
  generatedIdSequence += 1
  return `${prefix}-${Date.now()}-${generatedIdSequence}`
}
const today = (): string => new Date().toISOString().slice(0, 10)

const withoutLocation = (state: CmsDataState, id: string): CmsDataState => ({
  ...state,
  locations: state.locations.filter((item) => item.id !== id),
  campaigns: state.campaigns.map((item) => ({
    ...item,
    locationIds: item.locationIds.filter((locationId) => locationId !== id),
  })),
  kioskRequests: state.kioskRequests.filter((item) => item.locationId !== id),
  moderationItems: state.moderationItems.filter((item) => item.locationId !== id),
})

export function CmsDataProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<CmsDataState>(loadCmsData)

  useEffect(() => saveCmsData(state), [state])

  const currentUser =
    state.users.find((user) => user.id === state.currentUserId) ?? state.users[0]

  const setCurrentUserId = (id: string) => setState((previous) =>
    previous.users.some((user) => user.id === id && user.status === 'active')
      ? { ...previous, currentUserId: id }
      : previous,
  )

  const setCurrentRole = (role: CmsRole) => setState((previous) => {
    const user = previous.users.find(
      (item) => item.role === role && item.status === 'active',
    )
    return user ? { ...previous, currentUserId: user.id } : previous
  })

  const addLocation = (input: CreateLocationInput): Location => {
    const date = today()
    const location: Location = {
      category: 'Địa điểm', district: '', city: 'TP. Hồ Chí Minh',
      description: '', latitude: 10.7769, longitude: 106.7009,
      status: 'pending', ownerId: state.currentUserId, views: 0,
      ...input,
      id: makeId('loc'), createdAt: date, updatedAt: date,
    }
    setState((previous) => ({
      ...previous,
      locations: [location, ...previous.locations],
      moderationItems: location.status === 'pending'
        ? [{
            id: makeId('moderation'), locationId: location.id,
            submitterId: location.ownerId, title: `Đăng địa điểm ${location.name}`,
            note: 'Yêu cầu duyệt địa điểm mới.', status: 'pending', submittedAt: date,
          }, ...previous.moderationItems]
        : previous.moderationItems,
    }))
    return location
  }

  const updateLocation = (
    id: string, patch: Partial<Omit<Location, 'id' | 'createdAt'>>,
  ) => setState((previous) => ({
    ...previous,
    locations: previous.locations.map((item) => item.id === id
      ? { ...item, ...patch, id: item.id, createdAt: item.createdAt, updatedAt: today() }
      : item),
  }))

  const deleteLocation = (id: string) =>
    setState((previous) => withoutLocation(previous, id))

  const submitLocationForReview = (id: string, note = '') =>
    setState((previous) => {
      const location = previous.locations.find((item) => item.id === id)
      if (!location) return previous
      const date = today()
      const pending = previous.moderationItems.some(
        (item) => item.locationId === id && item.status === 'pending',
      )
      return {
        ...previous,
        locations: previous.locations.map((item) => item.id === id
          ? { ...item, status: 'pending', updatedAt: date }
          : item),
        moderationItems: pending ? previous.moderationItems : [{
          id: makeId('moderation'), locationId: id,
          submitterId: location.ownerId, title: `Duyệt địa điểm ${location.name}`,
          note, status: 'pending', submittedAt: date,
        }, ...previous.moderationItems],
      }
    })

  const reviewModerationItem = (id: string, decision: ReviewDecision, note = '') =>
    setState((previous) => {
      const review = previous.moderationItems.find((item) => item.id === id)
      if (!review || review.status !== 'pending') return previous
      const date = today()
      return {
        ...previous,
        moderationItems: previous.moderationItems.map((item) => item.id === id
          ? { ...item, status: decision, reviewNote: note,
              reviewerId: previous.currentUserId, reviewedAt: date }
          : item),
        locations: previous.locations.map((item) => item.id === review.locationId
          ? { ...item, status: decision === 'approved' ? 'published' : 'rejected',
              updatedAt: date }
          : item),
      }
    })

  const addCampaign = (input: CreateCampaignInput): KioskCampaign => {
    const date = today()
    const campaign: KioskCampaign = {
      description: '', status: 'draft', ownerId: state.currentUserId,
      locationIds: [], startDate: date, endDate: date, budget: 0, spent: 0,
      impressions: 0, clicks: 0, creativeTitle: '', creativeBody: '',
      ...input,
      id: makeId('camp'), createdAt: date, updatedAt: date,
    }
    setState((previous) => ({
      ...previous, campaigns: [campaign, ...previous.campaigns],
    }))
    return campaign
  }

  const updateCampaign = (
    id: string, patch: Partial<Omit<KioskCampaign, 'id' | 'createdAt'>>,
  ) => setState((previous) => ({
    ...previous,
    campaigns: previous.campaigns.map((item) => item.id === id
      ? { ...item, ...patch, id: item.id, createdAt: item.createdAt, updatedAt: today() }
      : item),
  }))

  const setCampaignStatus = (id: string, status: CampaignStatus) =>
    updateCampaign(id, { status })

  const deleteCampaign = (id: string) => setState((previous) => ({
    ...previous,
    campaigns: previous.campaigns.filter((item) => item.id !== id),
    kioskRequests: previous.kioskRequests.filter((item) => item.campaignId !== id),
  }))

  const addUser = (input: CreateUserInput): CmsUser => {
    const date = today()
    const user: CmsUser = {
      phone: '', status: 'active', organization: 'Cá nhân',
      ...input,
      id: makeId('user'), joinedAt: date, lastActiveAt: date,
    }
    setState((previous) => ({ ...previous, users: [user, ...previous.users] }))
    return user
  }

  const updateUser = (
    id: string, patch: Partial<Omit<CmsUser, 'id' | 'joinedAt'>>,
  ) => setState((previous) => ({
    ...previous,
    users: previous.users.map((item) => item.id === id
      ? { ...item, ...patch, id: item.id, joinedAt: item.joinedAt }
      : item),
  }))

  const deleteUser = (id: string) => setState((previous) => {
    if (previous.users.length <= 1) return previous
    const remainingUsers = previous.users.filter((item) => item.id !== id)
    const ownedLocations = previous.locations
      .filter((item) => item.ownerId === id)
      .map((item) => item.id)
    let next: CmsDataState = {
      ...previous,
      users: remainingUsers,
      currentUserId: previous.currentUserId === id
        ? remainingUsers[0].id : previous.currentUserId,
      locations: previous.locations.map((item) => item.managerId === id
        ? { ...item, managerId: undefined }
        : item),
      campaigns: previous.campaigns.filter((item) => item.ownerId !== id),
      kioskRequests: previous.kioskRequests.filter((item) =>
        item.requesterId !== id && item.reviewerId !== id),
      moderationItems: previous.moderationItems.filter((item) =>
        item.submitterId !== id && item.reviewerId !== id),
    }
    ownedLocations.forEach((locationId) => { next = withoutLocation(next, locationId) })
    const campaignIds = new Set(next.campaigns.map((item) => item.id))
    next.kioskRequests = next.kioskRequests.filter((item) =>
      !item.campaignId || campaignIds.has(item.campaignId))
    return next
  })

  const addKioskRequest = (input: CreateKioskRequestInput): KioskRequest => {
    const request: KioskRequest = {
      requesterId: state.currentUserId, message: '', durationDays: 14,
      status: 'pending', ...input,
      id: makeId('request'), submittedAt: today(),
    }
    setState((previous) => ({
      ...previous, kioskRequests: [request, ...previous.kioskRequests],
    }))
    return request
  }

  const updateKioskRequest = (
    id: string, patch: Partial<Omit<KioskRequest, 'id' | 'submittedAt'>>,
  ) => setState((previous) => ({
    ...previous,
    kioskRequests: previous.kioskRequests.map((item) => item.id === id
      ? { ...item, ...patch, id: item.id, submittedAt: item.submittedAt }
      : item),
  }))

  const reviewKioskRequest = (id: string, decision: ReviewDecision, note = '') =>
    setState((previous) => {
      const request = previous.kioskRequests.find((item) => item.id === id)
      if (!request || request.status !== 'pending') return previous
      const date = today()
      return {
        ...previous,
        kioskRequests: previous.kioskRequests.map((item) => item.id === id
          ? { ...item, status: decision, reviewNote: note,
              reviewerId: previous.currentUserId, reviewedAt: date }
          : item),
        campaigns: request.campaignId
          ? previous.campaigns.map((item) => item.id === request.campaignId
            ? { ...item,
                status: decision === 'approved'
                  ? (item.status === 'active' || item.status === 'completed' ? item.status : 'scheduled')
                  : 'rejected',
                updatedAt: date }
            : item)
          : previous.campaigns,
      }
    })

  const deleteKioskRequest = (id: string) => setState((previous) => ({
    ...previous,
    kioskRequests: previous.kioskRequests.filter((item) => item.id !== id),
  }))

  const addModerationItem = (input: CreateModerationInput): LocationModeration => {
    const review: LocationModeration = {
      submitterId: state.currentUserId, title: 'Duyệt địa điểm', note: '',
      status: 'pending', ...input,
      id: makeId('moderation'), submittedAt: today(),
    }
    setState((previous) => ({
      ...previous, moderationItems: [review, ...previous.moderationItems],
    }))
    return review
  }

  const updateModerationItem = (
    id: string, patch: Partial<Omit<LocationModeration, 'id' | 'submittedAt'>>,
  ) => setState((previous) => ({
    ...previous,
    moderationItems: previous.moderationItems.map((item) => item.id === id
      ? { ...item, ...patch, id: item.id, submittedAt: item.submittedAt }
      : item),
  }))

  const deleteModerationItem = (id: string) => setState((previous) => ({
    ...previous,
    moderationItems: previous.moderationItems.filter((item) => item.id !== id),
  }))

  const resetDemoData = () => setState(createDemoState())

  const value: CmsDataContextValue = {
    ...state, currentUser, currentRole: currentUser.role,
    setCurrentRole, setCurrentUserId,
    addLocation, updateLocation, deleteLocation, submitLocationForReview,
    reviewModerationItem, addCampaign, updateCampaign, setCampaignStatus,
    deleteCampaign, addUser, updateUser, deleteUser,
    addKioskRequest, updateKioskRequest, reviewKioskRequest, deleteKioskRequest,
    addModerationItem, updateModerationItem, deleteModerationItem, resetDemoData,
  }

  return <CmsDataContext.Provider value={value}>{children}</CmsDataContext.Provider>
}

export function useCmsData(): CmsDataContextValue {
  const context = useContext(CmsDataContext)
  if (!context) throw new Error('useCmsData must be used inside CmsDataProvider')
  return context
}
